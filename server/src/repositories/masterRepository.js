import { query } from '../config/db.js';

const COLUMNS = 'id, company_id, name, mobile, address, created_at, updated_at';

export async function list(companyId) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM masters
      WHERE company_id = $1 AND deleted_at IS NULL
      ORDER BY name`,
    [companyId],
  );
  return rows;
}

export async function findById(companyId, id, client = { query }) {
  const { rows } = await client.query(
    `SELECT ${COLUMNS} FROM masters
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
    [id, companyId],
  );
  return rows[0] ?? null;
}

export async function insert(client, companyId, { name, mobile, address, userId }) {
  const { rows } = await client.query(
    `INSERT INTO masters (company_id, name, mobile, address, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $5)
     RETURNING ${COLUMNS}`,
    [companyId, name, mobile, address, userId],
  );
  return rows[0];
}

export async function update(client, companyId, id, { name, mobile, address, userId }) {
  const { rows } = await client.query(
    `UPDATE masters
        SET name = $3, mobile = $4, address = $5, updated_by = $6, updated_at = now()
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING ${COLUMNS}`,
    [id, companyId, name, mobile, address, userId],
  );
  return rows[0] ?? null;
}

export async function softDelete(client, companyId, id, userId) {
  const { rows } = await client.query(
    `UPDATE masters SET deleted_at = now(), updated_by = $3
      WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
      RETURNING ${COLUMNS}`,
    [id, companyId, userId],
  );
  return rows[0] ?? null;
}

/** Prefix-first type-ahead for the Master Head field on every form. */
export async function search(companyId, term, limit = 10) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM masters
      WHERE company_id = $1 AND deleted_at IS NULL AND name ILIKE $2
      ORDER BY
        -- names that start with the term come first, then any other match
        CASE WHEN name ILIKE $3 THEN 0 ELSE 1 END,
        name
      LIMIT $4`,
    [companyId, `%${term}%`, `${term}%`, limit],
  );
  return rows;
}

/** Referenced by any lot or challan? Masters in use are not removable. */
export async function usageCount(companyId, id) {
  const { rows } = await query(
    `SELECT (SELECT COUNT(*) FROM grey_lots        WHERE master_id = $1 AND company_id = $2 AND deleted_at IS NULL)
          + (SELECT COUNT(*) FROM issue_challans   WHERE master_id = $1 AND company_id = $2 AND deleted_at IS NULL)
          + (SELECT COUNT(*) FROM receive_challans WHERE master_id = $1 AND company_id = $2 AND deleted_at IS NULL)
          AS total`,
    [id, companyId],
  );
  return Number(rows[0].total);
}
