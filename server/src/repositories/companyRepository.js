import { query } from '../config/db.js';

const COLUMNS = 'id, name, address, phone, created_at';

export async function list() {
  const { rows } = await query(`SELECT ${COLUMNS} FROM companies ORDER BY name`);
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM companies WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findByName(name) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM companies WHERE lower(name) = lower($1)`, [
    name,
  ]);
  return rows[0] ?? null;
}

export async function insert({ name, address, phone, createdBy }) {
  const { rows } = await query(
    `INSERT INTO companies (name, address, phone, created_by)
     VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
    [name, address ?? null, phone ?? null, createdBy],
  );
  return rows[0];
}

/** Name plus the letterhead lines printed on every challan. */
export async function update(id, { name, address, phone }) {
  const { rows } = await query(
    `UPDATE companies SET name = $2, address = $3, phone = $4
      WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, name, address ?? null, phone ?? null],
  );
  return rows[0] ?? null;
}
