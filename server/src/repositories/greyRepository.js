import { query } from '../config/db.js';
import { SqlBuilder, greyFilters } from './filters.js';

const SELECT = `
  SELECT g.id, g.company_id, g.lot_no, g.date, g.master_id, m.name AS master_head,
         g.fabric, g.chart, g.cut, g.quantity, g.dupatta, g.bottom,
         g.created_at, g.updated_at,
         COALESCE(i.issued_qty, 0) AS issued_qty,
         COALESCE(i.issued_dup, 0) AS issued_dup,
         (SELECT COUNT(*) FROM record_revisions r
           WHERE r.table_name = 'grey_lots' AND r.record_id = g.id) AS revision_count
    FROM grey_lots g
    LEFT JOIN masters m ON m.id = g.master_id
    LEFT JOIN LATERAL (
      SELECT SUM(quantity) AS issued_qty, SUM(dup_qty) AS issued_dup
        FROM issue_challans ic
       WHERE ic.lot_id = g.id AND ic.deleted_at IS NULL
    ) i ON true
   WHERE g.company_id = $1 AND g.deleted_at IS NULL`;

export async function list(companyId, filters = {}) {
  const builder = new SqlBuilder(2);
  greyFilters(builder, filters);

  const { rows } = await query(`${SELECT} ${builder.where} ORDER BY g.date DESC, g.id DESC`, [
    companyId,
    ...builder.params,
  ]);
  return rows;
}

export async function findById(companyId, id, client = { query }) {
  const { rows } = await client.query(`${SELECT} AND g.id = $2`, [companyId, id]);
  return rows[0] ?? null;
}

/** Type-ahead for the lot no. field on the challan forms. */
export async function search(companyId, term, limit = 10) {
  const { rows } = await query(
    `${SELECT} AND g.lot_no ILIKE $2 ORDER BY g.lot_no DESC LIMIT $3`,
    [companyId, `%${term}%`, limit],
  );
  return rows;
}

export async function insert(client, companyId, data) {
  const { rows } = await client.query(
    `INSERT INTO grey_lots
       (company_id, lot_no, date, master_id, fabric, chart, cut, quantity, dupatta, bottom,
        created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
     RETURNING id`,
    [
      companyId,
      data.lotNo,
      data.date,
      data.masterId,
      data.fabric,
      data.chart,
      data.cut,
      data.quantity,
      data.dupatta,
      data.bottom,
      data.userId,
    ],
  );
  return rows[0].id;
}

export async function update(client, companyId, id, data) {
  const { rows } = await client.query(
    `UPDATE grey_lots
        SET date = $3, master_id = $4, fabric = $5, chart = $6, cut = $7,
            quantity = $8, dupatta = $9, bottom = $10,
            updated_by = $11, updated_at = now()
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING id`,
    [
      id,
      companyId,
      data.date,
      data.masterId,
      data.fabric,
      data.chart,
      data.cut,
      data.quantity,
      data.dupatta,
      data.bottom,
      data.userId,
    ],
  );
  return rows[0]?.id ?? null;
}

export async function softDelete(client, companyId, id, userId) {
  const { rows } = await client.query(
    `UPDATE grey_lots SET deleted_at = now(), updated_by = $3
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING id`,
    [id, companyId, userId],
  );
  return rows[0]?.id ?? null;
}

/** A lot with challans against it must not disappear from under them. */
export async function challanCount(companyId, id) {
  const { rows } = await query(
    `SELECT COUNT(*) AS total FROM issue_challans
      WHERE lot_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [id, companyId],
  );
  return Number(rows[0].total);
}
