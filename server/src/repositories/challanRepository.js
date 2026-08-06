import { query } from '../config/db.js';
import { SqlBuilder, challanFilters } from './filters.js';

/**
 * Both challan tables share a shape, so one repository serves embroidery and
 * handwork, issue and receive. `kind` picks the trade, the function picks the
 * direction.
 */

const ISSUE_SELECT = `
  SELECT c.id, c.company_id, c.kind, c.challan_no, c.date, c.lot_id, l.lot_no,
         c.master_id, m.name AS master_head, c.fabric, c.design, c.dupatta,
         c.dup_qty, c.quantity, c.rate, c.amount, c.created_at, c.updated_at,
         (c.quantity + CASE WHEN c.kind = 'handwork' THEN 0 ELSE c.dup_qty END) AS issued_pieces,
         COALESCE(r.received_qty, 0) + COALESCE(r.received_dup, 0) AS received_pieces,
         COALESCE(r.received_qty, 0) AS received_qty,
         COALESCE(r.received_dup, 0) AS received_dup,
         (SELECT COUNT(*) FROM record_revisions rr
           WHERE rr.table_name = 'issue_challans' AND rr.record_id = c.id) AS revision_count
    FROM issue_challans c
    LEFT JOIN grey_lots l ON l.id = c.lot_id
    LEFT JOIN masters m   ON m.id = c.master_id
    LEFT JOIN LATERAL (
      SELECT SUM(quantity) AS received_qty,
             SUM(CASE WHEN c.kind = 'handwork' THEN 0 ELSE dup_qty END) AS received_dup
        FROM receive_challans rc
       WHERE rc.issue_challan_id = c.id AND rc.deleted_at IS NULL
    ) r ON true
   WHERE c.company_id = $1 AND c.kind = $2 AND c.deleted_at IS NULL`;

const RECEIVE_SELECT = `
  SELECT c.id, c.company_id, c.kind, c.challan_no, c.retail_challan_no, c.date,
         c.issue_challan_id, ic.challan_no AS issue_challan_no,
         c.lot_id, l.lot_no, c.master_id, m.name AS master_head,
         c.fabric, c.design, c.dupatta, c.dup_qty, c.quantity, c.rate,
         c.damage_loss, c.amount, c.created_at, c.updated_at,
         (ic.quantity + CASE WHEN c.kind = 'handwork' THEN 0 ELSE ic.dup_qty END) AS issued_pieces,
         COALESCE(agg.received_qty, 0) + COALESCE(agg.received_dup, 0) AS received_pieces,
         (SELECT COUNT(*) FROM record_revisions rr
           WHERE rr.table_name = 'receive_challans' AND rr.record_id = c.id) AS revision_count
    FROM receive_challans c
    LEFT JOIN issue_challans ic ON ic.id = c.issue_challan_id
    LEFT JOIN grey_lots l       ON l.id = c.lot_id
    LEFT JOIN masters m         ON m.id = c.master_id
    LEFT JOIN LATERAL (
      SELECT SUM(quantity) AS received_qty,
             SUM(CASE WHEN c.kind = 'handwork' THEN 0 ELSE dup_qty END) AS received_dup
        FROM receive_challans rc
       WHERE rc.issue_challan_id = c.issue_challan_id AND rc.deleted_at IS NULL
    ) agg ON true
   WHERE c.company_id = $1 AND c.kind = $2 AND c.deleted_at IS NULL`;

const select = (direction) => (direction === 'issue' ? ISSUE_SELECT : RECEIVE_SELECT);
const table = (direction) => (direction === 'issue' ? 'issue_challans' : 'receive_challans');

export async function list(direction, companyId, kind, filters = {}) {
  const builder = new SqlBuilder(3);
  challanFilters(builder, filters);

  const { rows } = await query(
    `${select(direction)} ${builder.where} ORDER BY c.date DESC, c.id DESC`,
    [companyId, kind, ...builder.params],
  );
  return rows;
}

export async function findById(direction, companyId, kind, id, client = { query }) {
  const { rows } = await client.query(`${select(direction)} AND c.id = $3`, [companyId, kind, id]);
  return rows[0] ?? null;
}

/** Type-ahead for the challan no. field on the receive forms. */
export async function searchIssues(companyId, kind, term, limit = 10) {
  const { rows } = await query(
    `${ISSUE_SELECT} AND c.challan_no ILIKE $3 ORDER BY c.challan_no DESC LIMIT $4`,
    [companyId, kind, `%${term}%`, limit],
  );
  return rows;
}

export async function insertIssue(client, companyId, kind, d) {
  const { rows } = await client.query(
    `INSERT INTO issue_challans
       (company_id, kind, challan_no, date, lot_id, master_id, fabric, design,
        dupatta, dup_qty, quantity, rate, amount, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
     RETURNING id`,
    [
      companyId, kind, d.challanNo, d.date, d.lotId, d.masterId, d.fabric, d.design,
      d.dupatta, d.dupQty, d.quantity, d.rate, d.amount, d.userId,
    ],
  );
  return rows[0].id;
}

export async function updateIssue(client, companyId, kind, id, d) {
  const { rows } = await client.query(
    `UPDATE issue_challans
        SET challan_no = $4, date = $5, lot_id = $6, master_id = $7, fabric = $8,
            design = $9, dupatta = $10, dup_qty = $11, quantity = $12, rate = $13,
            amount = $14, updated_by = $15, updated_at = now()
      WHERE id = $1 AND company_id = $2 AND kind = $3 AND deleted_at IS NULL
      RETURNING id`,
    [
      id, companyId, kind, d.challanNo, d.date, d.lotId, d.masterId, d.fabric,
      d.design, d.dupatta, d.dupQty, d.quantity, d.rate, d.amount, d.userId,
    ],
  );
  return rows[0]?.id ?? null;
}

export async function insertReceive(client, companyId, kind, d) {
  const { rows } = await client.query(
    `INSERT INTO receive_challans
       (company_id, kind, issue_challan_id, challan_no, retail_challan_no, date,
        lot_id, master_id, fabric, design, dupatta, dup_qty, quantity, rate,
        damage_loss, amount, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
     RETURNING id`,
    [
      companyId, kind, d.issueChallanId, d.challanNo, d.retailChallanNo, d.date,
      d.lotId, d.masterId, d.fabric, d.design, d.dupatta, d.dupQty, d.quantity,
      d.rate, d.damageLoss, d.amount, d.userId,
    ],
  );
  return rows[0].id;
}

export async function updateReceive(client, companyId, kind, id, d) {
  const { rows } = await client.query(
    `UPDATE receive_challans
        SET issue_challan_id = $4, challan_no = $5, retail_challan_no = $6, date = $7,
            lot_id = $8, master_id = $9, fabric = $10, design = $11, dupatta = $12,
            dup_qty = $13, quantity = $14, rate = $15, damage_loss = $16,
            amount = $17, updated_by = $18, updated_at = now()
      WHERE id = $1 AND company_id = $2 AND kind = $3 AND deleted_at IS NULL
      RETURNING id`,
    [
      id, companyId, kind, d.issueChallanId, d.challanNo, d.retailChallanNo, d.date,
      d.lotId, d.masterId, d.fabric, d.design, d.dupatta, d.dupQty, d.quantity,
      d.rate, d.damageLoss, d.amount, d.userId,
    ],
  );
  return rows[0]?.id ?? null;
}

export async function softDelete(client, direction, companyId, kind, id, userId) {
  const { rows } = await client.query(
    `UPDATE ${table(direction)} SET deleted_at = now(), updated_by = $4
      WHERE id = $1 AND company_id = $2 AND kind = $3 AND deleted_at IS NULL
      RETURNING id`,
    [id, companyId, kind, userId],
  );
  return rows[0]?.id ?? null;
}

/** Receipts booked against an issue - it cannot be deleted while any exist. */
export async function receiveCount(companyId, issueId) {
  const { rows } = await query(
    `SELECT COUNT(*) AS total FROM receive_challans
      WHERE issue_challan_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [issueId, companyId],
  );
  return Number(rows[0].total);
}
