/**
 * Quantity limits.
 *
 * steps.md: "quantity and dup. qty are bounded to total quantity mention with
 * lot" and "Even issue challan quantity can be received in parts keep track
 * that quantity does not exceed."
 *
 * Every helper takes a transaction client and locks the parent row, so two
 * concurrent challans cannot each pass the check and jointly overshoot.
 */
import { WORK_KINDS } from '../config/constants.js';
import { badRequest, notFound } from './httpError.js';

/**
 * Locks a lot and reports what this trade may still issue against it.
 *
 * The two trades form a chain rather than sharing one pool:
 *
 *   grey lot -> embroidery issue -> embroidery receive -> handwork issue -> ...
 *
 * so embroidery draws on the lot itself, and handwork draws on what embroidery
 * has actually given back. A lot with no embroidery challans at all falls back
 * to the lot quantity, which is what keeps handwork-only lots working.
 */
export async function lotCapacity(client, { companyId, lotId, kind, excludeIssueId = null }) {
  const { rows } = await client.query(
    `SELECT id, lot_no, quantity, dupatta
       FROM grey_lots
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
        FOR UPDATE`,
    [lotId, companyId],
  );
  const lot = rows[0];
  if (!lot) throw notFound('That lot does not exist.');

  // Only this trade's own challans count against its ceiling.
  const { rows: used } = await client.query(
    `SELECT COALESCE(SUM(quantity), 0) AS quantity,
            COALESCE(SUM(dup_qty), 0)  AS dup_qty
       FROM issue_challans
      WHERE lot_id = $1 AND company_id = $2 AND kind = $3 AND deleted_at IS NULL
        AND ($4::bigint IS NULL OR id <> $4)`,
    [lotId, companyId, kind, excludeIssueId],
  );

  const total = Number(lot.quantity);
  const issuedQty = Number(used[0].quantity);
  const issuedDup = Number(used[0].dup_qty);

  // A lot recorded without a dupatta has none to issue, so its dupatta ceiling
  // is zero rather than the lot quantity.
  const hasDupatta = lot.dupatta !== 'no';

  // Dupatta follows the same chain as garments - both trades carry it, so
  // without this the two would draw on one shared pool and double-spend it.
  const [garment, dupatta] = await Promise.all([
    issueCeiling(client, { companyId, lotId, kind, total, column: 'quantity' }),
    hasDupatta
      ? issueCeiling(client, { companyId, lotId, kind, total, column: 'dup_qty' })
      : Promise.resolve({ ceiling: 0, ceilingLabel: 'the lot holds' }),
  ]);

  return {
    lot,
    total,
    ceiling: garment.ceiling,
    ceilingLabel: garment.ceilingLabel,
    dupCeiling: dupatta.ceiling,
    dupCeilingLabel: dupatta.ceilingLabel,
    issuedQty,
    issuedDup,
    hasDupatta,
    remainingQty: Math.max(0, garment.ceiling - issuedQty),
    remainingDup: hasDupatta ? Math.max(0, dupatta.ceiling - issuedDup) : 0,
  };
}

/**
 * How many pieces this trade is allowed to draw on in total, and a phrase
 * naming where that figure comes from for the rejection message.
 */
async function issueCeiling(client, { companyId, lotId, kind, total, column }) {
  if (kind !== WORK_KINDS.HANDWORK) {
    return { ceiling: total, ceilingLabel: 'the lot holds' };
  }

  // Locking the embroidery issue rows is what makes the handwork check safe:
  // booking a receipt takes `FOR UPDATE` on its parent issue challan
  // (see issueOutstanding below), so a concurrent receive cannot slip in
  // between reading this figure and writing the handwork challan.
  const { rows: embroidery } = await client.query(
    `SELECT id FROM issue_challans
      WHERE lot_id = $1 AND company_id = $2 AND kind = $3 AND deleted_at IS NULL
        FOR UPDATE`,
    [lotId, companyId, WORK_KINDS.EMBROIDERY],
  );

  // Never went through embroidery, so there is nothing to chain off.
  if (embroidery.length === 0) return { ceiling: total, ceilingLabel: 'the lot holds' };

  // `column` is 'quantity' or 'dup_qty', chosen by the caller - never user
  // input - so interpolating it is safe and keeps one query for both axes.
  const { rows: back } = await client.query(
    `SELECT COALESCE(SUM(rc.${column === 'dup_qty' ? 'dup_qty' : 'quantity'}), 0) AS received
       FROM receive_challans rc
       JOIN issue_challans ic ON ic.id = rc.issue_challan_id
      WHERE ic.lot_id = $1 AND ic.company_id = $2 AND ic.kind = $3
        AND ic.deleted_at IS NULL AND rc.deleted_at IS NULL`,
    [lotId, companyId, WORK_KINDS.EMBROIDERY],
  );

  return { ceiling: Number(back[0].received), ceilingLabel: 'is back from embroidery' };
}

/** Rejects an issue that would take more than this trade still has available. */
export async function assertIssueWithinLot(
  client,
  { companyId, lotId, kind, quantity, dupQty, excludeIssueId },
) {
  const capacity = await lotCapacity(client, { companyId, lotId, kind, excludeIssueId });

  if (Number(quantity) > capacity.remainingQty) {
    throw badRequest(
      `Quantity exceeds what ${capacity.ceilingLabel} for lot ${capacity.lot.lot_no} ` +
        `(${capacity.remainingQty} left of ${capacity.ceiling}` +
        `${capacity.issuedQty > 0 ? `, ${capacity.issuedQty} already issued` : ''}).`,
    );
  }
  if (Number(dupQty) > 0 && !capacity.hasDupatta) {
    throw badRequest(`Lot ${capacity.lot.lot_no} has no dupatta, so its dupatta quantity is zero.`);
  }
  if (Number(dupQty) > capacity.remainingDup) {
    throw badRequest(
      `Dupatta quantity exceeds what ${capacity.dupCeilingLabel} for lot ${capacity.lot.lot_no} ` +
        `(${capacity.remainingDup} left of ${capacity.dupCeiling}` +
        `${capacity.issuedDup > 0 ? `, ${capacity.issuedDup} already issued` : ''}).`,
    );
  }

  return capacity;
}

/** Locks an issue challan and reports what is still outstanding on it. */
export async function issueOutstanding(client, { companyId, issueId, excludeReceiveId = null }) {
  const { rows } = await client.query(
    `SELECT id, kind, challan_no, quantity, dup_qty, lot_id, master_id, fabric, design, dupatta, rate
       FROM issue_challans
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
        FOR UPDATE`,
    [issueId, companyId],
  );
  const issue = rows[0];
  if (!issue) throw notFound('That issue challan does not exist.');

  const { rows: got } = await client.query(
    `SELECT COALESCE(SUM(quantity), 0) AS quantity,
            COALESCE(SUM(dup_qty), 0)  AS dup_qty
       FROM receive_challans
      WHERE issue_challan_id = $1 AND company_id = $2 AND deleted_at IS NULL
        AND ($3::bigint IS NULL OR id <> $3)`,
    [issueId, companyId, excludeReceiveId],
  );

  const receivedQty = Number(got[0].quantity);
  const receivedDup = Number(got[0].dup_qty);

  return {
    issue,
    issuedQty: Number(issue.quantity),
    issuedDup: Number(issue.dup_qty),
    receivedQty,
    receivedDup,
    outstandingQty: Number(issue.quantity) - receivedQty,
    outstandingDup: Number(issue.dup_qty) - receivedDup,
  };
}

/** Rejects a receipt larger than what the issue still owes. */
export async function assertReceiveWithinIssue(
  client,
  { companyId, issueId, quantity, dupQty, excludeReceiveId },
) {
  const state = await issueOutstanding(client, { companyId, issueId, excludeReceiveId });

  if (Number(quantity) > state.outstandingQty) {
    throw badRequest(
      `Quantity exceeds what challan ${state.issue.challan_no} still owes (${state.outstandingQty} of ${state.issuedQty}).`,
    );
  }
  if (Number(dupQty) > state.outstandingDup) {
    throw badRequest(
      `Dupatta quantity exceeds what challan ${state.issue.challan_no} still owes (${state.outstandingDup} of ${state.issuedDup}).`,
    );
  }

  return state;
}
