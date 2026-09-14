import { issueSection, receiveSection, delayDays } from '../utils/sections.js';

const base = (row) => ({
  id: Number(row.id),
  kind: row.kind,
  challanNo: row.challan_no,
  date: row.date,
  lotId: row.lot_id ? Number(row.lot_id) : null,
  lotNo: row.lot_no ?? '',
  masterId: row.master_id ? Number(row.master_id) : null,
  masterHead: row.master_head ?? '',
  fabric: row.fabric ?? '',
  chart: row.chart ?? '',
  design: row.design ?? '',
  dupatta: row.dupatta ?? null,
  dupQty: Number(row.dup_qty ?? 0),
  quantity: Number(row.quantity ?? 0),
  rate: Number(row.rate ?? 0),
  amount: Number(row.amount ?? 0),
  revisionCount: Number(row.revision_count ?? 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function toIssueChallan(row, now = new Date()) {
  if (!row) return null;
  const issued = Number(row.issued_pieces ?? 0);
  const received = Number(row.received_pieces ?? 0);

  return {
    ...base(row),
    issuedPieces: issued,
    receivedPieces: received,
    outstandingPieces: issued - received,
    outstandingQty: Number(row.quantity ?? 0) - Number(row.received_qty ?? 0),
    outstandingDup: Number(row.dup_qty ?? 0) - Number(row.received_dup ?? 0),
    section: issueSection(row, now),
    delayDays: delayDays(row, now),
  };
}

export function toReceiveChallan(row) {
  if (!row) return null;
  return {
    ...base(row),
    retailChallanNo: row.retail_challan_no ?? '',
    issueChallanId: row.issue_challan_id ? Number(row.issue_challan_id) : null,
    issueChallanNo: row.issue_challan_no ?? '',
    damageLoss: Number(row.damage_loss ?? 0),
    section: receiveSection(row),
  };
}

export const toIssueChallans = (rows, now = new Date()) =>
  rows.map((row) => toIssueChallan(row, now));

export const toReceiveChallans = (rows) => rows.map((row) => toReceiveChallan(row));
