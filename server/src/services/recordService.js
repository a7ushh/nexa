/**
 * The shared write path for every business record.
 *
 * steps.md asks for two things on every change: keep the previous data
 * (`assets/previous_data.png`), and log every change to the application. Routing
 * all writes through here means neither can be forgotten in a module.
 */
import { withTransaction } from '../config/db.js';
import * as logService from './logService.js';
import { LOG_ACTIONS } from '../config/constants.js';

/** Snapshots the row as it stands into record_revisions, newest version last. */
export async function snapshot(client, { table, id, companyId, row, changedBy }) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(version), 0) + 1 AS next
       FROM record_revisions WHERE table_name = $1 AND record_id = $2`,
    [table, id],
  );

  await client.query(
    `INSERT INTO record_revisions (table_name, record_id, company_id, version, previous_data, changed_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [table, id, companyId, rows[0].next, JSON.stringify(row), changedBy],
  );

  return rows[0].next;
}

/** Every stored version of a record, oldest first, for the history trail. */
export async function revisions(client, { table, id }) {
  const { rows } = await client.query(
    `SELECT r.version, r.previous_data, r.changed_at,
            u.name AS changed_by_name, u.username AS changed_by_username
       FROM record_revisions r
       LEFT JOIN users u ON u.id = r.changed_by
      WHERE r.table_name = $1 AND r.record_id = $2
      ORDER BY r.version`,
    [table, id],
  );

  return rows.map((row) => ({
    version: row.version,
    data: row.previous_data,
    changedAt: row.changed_at,
    changedBy: row.changed_by_name || row.changed_by_username || null,
  }));
}

/**
 * Runs `write` in a transaction and logs the outcome.
 *
 * `write(client)` should return `{ record, entityId, details }`.
 */
export async function perform(req, { action, entity, companyId }, write) {
  const result = await withTransaction((client) => write(client));

  await logService.record(req, {
    action,
    entity,
    entityId: result.entityId ?? result.record?.id ?? null,
    details: result.details ?? null,
    companyId: companyId ?? req.companyId,
  });

  return result.record;
}

export { LOG_ACTIONS };
