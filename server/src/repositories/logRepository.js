import { query } from '../config/db.js';

export async function insert({ companyId, userId, action, entity, entityId, details, ip }) {
  await query(
    `INSERT INTO activity_logs (company_id, user_id, action, entity, entity_id, details, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [companyId ?? null, userId ?? null, action, entity ?? null, entityId ?? null, details ?? null, ip ?? null],
  );
}

export async function list({ limit = 200, offset = 0, companyId = null } = {}) {
  const { rows } = await query(
    `SELECT l.id, l.action, l.entity, l.entity_id, l.details, l.ip, l.created_at,
            l.company_id, c.name AS company_name,
            u.id AS user_id, u.name AS user_name, u.email AS user_email, u.username, u.role
       FROM activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
       LEFT JOIN companies c ON c.id = l.company_id
      WHERE ($3::bigint IS NULL OR l.company_id = $3)
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset, companyId],
  );
  return rows;
}
