import { greySection } from '../utils/sections.js';

export function toGreyLot(row, now = new Date()) {
  if (!row) return null;

  const quantity = Number(row.quantity);
  const issuedQty = Number(row.issued_qty ?? 0);
  const issuedDup = Number(row.issued_dup ?? 0);

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
    // What is still free to put on a challan - shown by the lot type-ahead.
    // A lot recorded without a dupatta has none to issue, so its dupatta
    // capacity is zero rather than the lot quantity.
    remainingQty: quantity - issuedQty,
    remainingDup: row.dupatta === 'no' ? 0 : quantity - issuedDup,
    revisionCount: Number(row.revision_count ?? 0),
    section: greySection(row, now),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const toGreyLots = (rows, now = new Date()) => rows.map((row) => toGreyLot(row, now));
