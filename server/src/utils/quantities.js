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

/** Locks a lot and reports what is still free to issue. */
export async function lotCapacity(client, { companyId, lotId, excludeIssueId = null }) {
  const { rows } = await client.query(
    `SELECT id, lot_no, quantity, dupatta
       FROM grey_lots
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
        FOR UPDATE`,
    [lotId, companyId],
  );
  const lot = rows[0];
  if (!lot) throw notFound('That lot does not exist.');

  const { rows: used } = await client.query(
    `SELECT COALESCE(SUM(quantity), 0) AS quantity,
            COALESCE(SUM(dup_qty), 0)  AS dup_qty
       FROM issue_challans
      WHERE lot_id = $1 AND company_id = $2 AND deleted_at IS NULL
        AND ($3::bigint IS NULL OR id <> $3)`,
    [lotId, companyId, excludeIssueId],
  );

  const total = Number(lot.quantity);
  const issuedQty = Number(used[0].quantity);
  const issuedDup = Number(used[0].dup_qty);

  // A lot recorded without a dupatta has none to issue, so its dupatta
  // capacity is zero rather than the lot quantity.
  const hasDupatta = lot.dupatta !== 'no';

  return {
    lot,
    total,
    issuedQty,
    issuedDup,
    hasDupatta,
    // Dupatta pieces draw on the same lot total as the garments themselves.
    remainingQty: total - issuedQty,
    remainingDup: hasDupatta ? total - issuedDup : 0,
  };
}

/** Rejects an issue that would take more than the lot still holds. */
export async function assertIssueWithinLot(client, { companyId, lotId, quantity, dupQty, excludeIssueId }) {
  const capacity = await lotCapacity(client, { companyId, lotId, excludeIssueId });

  if (Number(quantity) > capacity.remainingQty) {
    throw badRequest(
      `Quantity exceeds what lot ${capacity.lot.lot_no} has left (${capacity.remainingQty} of ${capacity.total}).`,
    );
  }
  if (Number(dupQty) > 0 && !capacity.hasDupatta) {
    throw badRequest(`Lot ${capacity.lot.lot_no} has no dupatta, so its dupatta quantity is zero.`);
  }
  if (Number(dupQty) > capacity.remainingDup) {
    throw badRequest(
      `Dupatta quantity exceeds what lot ${capacity.lot.lot_no} has left (${capacity.remainingDup} of ${capacity.total}).`,
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
  if (state.issue.kind !== WORK_KINDS.HANDWORK && Number(dupQty) > state.outstandingDup) {
    throw badRequest(
      `Dupatta quantity exceeds what challan ${state.issue.challan_no} still owes (${state.outstandingDup} of ${state.issuedDup}).`,
    );
  }

  return state;
}
