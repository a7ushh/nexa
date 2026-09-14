import { query } from '../config/db.js';

const COLUMNS = `id, google_sub, email, name, picture, username, pin_hash,
                 role, status, last_access_at, created_at`;

export async function findById(id) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findByEmail(email) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM users WHERE email = $1`, [
    email.toLowerCase(),
  ]);
  return rows[0] ?? null;
}

export async function findByGoogleSub(googleSub) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM users WHERE google_sub = $1`, [googleSub]);
  return rows[0] ?? null;
}

export async function findByUsername(username) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM users WHERE lower(username) = lower($1)`, [
    username,
  ]);
  return rows[0] ?? null;
}

export async function listAll() {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM users WHERE status <> 'removed' ORDER BY created_at`,
  );
  return rows;
}

/**
 * Creates the user on first Google sign-in, or refreshes the Google-owned
 * fields on later sign-ins. Matching is by google_sub first, then by email so a
 * root row seeded from SQL (which has no google_sub yet) adopts its Google id.
 */
export async function upsertFromGoogle({ googleSub, email, name, picture }) {
  const { rows } = await query(
    `INSERT INTO users (google_sub, email, name, picture, status)
     VALUES ($1, $2, $3, $4, 'pending')
     ON CONFLICT (email) DO UPDATE
       SET google_sub = COALESCE(users.google_sub, EXCLUDED.google_sub),
           name       = CASE WHEN users.name = '' THEN EXCLUDED.name ELSE users.name END,
           picture    = EXCLUDED.picture,
           updated_at = now()
     RETURNING ${COLUMNS}`,
    [googleSub, email.toLowerCase(), name, picture],
  );
  return rows[0];
}

export async function setProfile(id, { username, pinHash }) {
  const { rows } = await query(
    `UPDATE users SET username = $2, pin_hash = $3, updated_at = now()
     WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, username, pinHash],
  );
  return rows[0] ?? null;
}

export async function touchLastAccess(id) {
  await query('UPDATE users SET last_access_at = now() WHERE id = $1', [id]);
}

export async function updateRole(id, role) {
  const { rows } = await query(
    `UPDATE users SET role = $2, status = 'active', updated_at = now()
     WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, role],
  );
  return rows[0] ?? null;
}

export async function updateStatus(id, status) {
  const { rows } = await query(
    `UPDATE users SET status = $2, updated_at = now() WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, status],
  );
  return rows[0] ?? null;
}
