import { greySection } from '../utils/sections.js';
import { WORK_KINDS } from '../config/constants.js';

const atLeastZero = (value) => Math.max(0, value);

/**
 * Where the lot's pieces physically are, in flow order.
 *
 * Computed here rather than in SQL so the arithmetic sits next to the rule it
 * encodes. Every segment is floored at zero: shrinking a lot, or deleting a
 * challan, can otherwise leave a stage momentarily "over-issued" and produce a
 * negative bar.
 *
 * `columns` picks the axis - garments or dupatta - so both follow one rule.
 */
function stagesFor(row, total, columns) {
  const embIssued = Number(row[columns.emb.issued] ?? 0);
  const embReceived = Number(row[columns.emb.received] ?? 0);
  const hwIssued = Number(row[columns.hw.issued] ?? 0);
  const hwReceived = Number(row[columns.hw.received] ?? 0);

  // A handwork-only lot never passes through embroidery, so its pieces leave
  // grey on the handwork challan instead.
  const leftGrey = embIssued > 0 ? embIssued : hwIssued;

  return {
    inGrey: atLeastZero(total - leftGrey),
    atEmbroidery: atLeastZero(embIssued - embReceived),
    awaitingHandwork: atLeastZero(embReceived - hwIssued),
    atHandwork: atLeastZero(hwIssued - hwReceived),
    completed: hwReceived,
  };
}

/**
 * How much of the lot this trade may still put on a challan.
 *
 * Embroidery draws on the lot itself; handwork draws on what embroidery gave
 * back. A lot with no embroidery challans at all falls back to the lot quantity
 * so handwork-only lots keep working. Mirrors utils/quantities.js, which is
 * what actually enforces it - this value only drives the type-ahead hint.
 *
 * `issued` / `received` name the pair of columns to chain on, so garments and
 * dupatta follow exactly the same rule.
 */
function remainingFor(row, ceilingWhenFresh, kind, { emb, hw }) {
  const embIssued = Number(row[emb.issued] ?? 0);

  if (kind === WORK_KINDS.HANDWORK) {
    const ceiling = embIssued > 0 ? Number(row[emb.received] ?? 0) : ceilingWhenFresh;
    return atLeastZero(ceiling - Number(row[hw.issued] ?? 0));
  }

  return atLeastZero(ceilingWhenFresh - embIssued);
}

const QTY_COLUMNS = {
  emb: { issued: 'emb_issued', received: 'emb_received' },
  hw: { issued: 'hw_issued', received: 'hw_received' },
};

const DUP_COLUMNS = {
  emb: { issued: 'emb_issued_dup', received: 'emb_received_dup' },
  hw: { issued: 'hw_issued_dup', received: 'hw_received_dup' },
};

/**
 * Why this lot cannot be closed by hand yet, or null when it can.
 *
 * Closing says "this lot is finished even though it never went to handwork", so
 * it is only honest once nothing is still moving: nothing left un-issued, and
 * nothing sitting at a contractor on either axis.
 *
 * The asymmetry is deliberate. Un-issued *garments* block a close - they are
 * work not yet started. Un-issued *dupatta* does not: a lot may carry a dupatta
 * and simply never use all of it, so only dupatta actually out at a contractor
 * counts. LotProgress applies the same rule to decide whether to show the
 * button; this is what enforces it.
 */
export function closeBlocker(row) {
  const total = Number(row.quantity ?? 0);

  const outAndUnissued = (issued, received, hwIssued, hwReceived, axisTotal) => {
    const iss = Number(issued ?? 0);
    const out = iss - Number(received ?? 0) + (Number(hwIssued ?? 0) - Number(hwReceived ?? 0));
    const leftGrey = iss > 0 ? iss : Number(hwIssued ?? 0);
    return { out, notIssued: axisTotal - leftGrey };
  };

  const garment = outAndUnissued(
    row.emb_issued, row.emb_received, row.hw_issued, row.hw_received, total,
  );
  if (garment.notIssued > 0) return `${garment.notIssued} not issued`;
  if (garment.out > 0) return `${garment.out} still out`;

  // A lot recorded without a dupatta has no dupatta axis to settle.
  if (row.dupatta === 'no') return null;

  const dupatta = outAndUnissued(
    row.emb_issued_dup, row.emb_received_dup, row.hw_issued_dup, row.hw_received_dup, total,
  );
  return dupatta.out > 0 ? `${dupatta.out} dupatta still out` : null;
}

export function toGreyLot(row, { kind } = {}) {
  if (!row) return null;

  const quantity = Number(row.quantity);
  // A lot recorded without a dupatta has none to issue, so its dupatta ceiling
  // is zero rather than the lot quantity.
  const dupCeiling = row.dupatta === 'no' ? 0 : quantity;

  return {
    id: Number(row.id),
    lotNo: row.lot_no,
    date: row.date,
    masterId: row.master_id ? Number(row.master_id) : null,
    masterHead: row.master_head ?? '',
    fabric: row.fabric ?? '',
    chart: row.chart ?? '',
    cut: row.cut ?? '',
    quantity,
    dupatta: row.dupatta,
    bottom: row.bottom,
    // What is still free to put on a challan of this trade - shown by the lot
    // type-ahead. Dupatta chains exactly as garments do.
    remainingQty: remainingFor(row, quantity, kind, QTY_COLUMNS),
    remainingDup: dupCeiling === 0 ? 0 : remainingFor(row, dupCeiling, kind, DUP_COLUMNS),
    // Garments and dupatta move through the chain independently, so they are
    // tracked as two separate axes rather than one combined figure.
    stages: stagesFor(row, quantity, QTY_COLUMNS),
    dupStages: dupCeiling === 0 ? null : stagesFor(row, dupCeiling, DUP_COLUMNS),
    dupTotal: dupCeiling,
    revisionCount: Number(row.revision_count ?? 0),
    section: greySection(row),
    closedAt: row.closed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const toGreyLots = (rows, options = {}) => rows.map((row) => toGreyLot(row, options));
