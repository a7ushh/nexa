/**
 * Forward-only migration runner.
 *
 * Applies every .sql file in server/db/migrations in filename order and records
 * it in schema_migrations so re-running is a no-op. Existing data is never
 * dropped - new migrations must be additive.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pool, closePool } from '../config/db.js';
import { serverDir } from '../config/env.js';

const migrationsDir = path.join(serverDir, 'db', 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function runMigrations({ log = console.log } = {}) {
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`  applied ${file}`);
        count += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }

    if (count === 0) log('  database already up to date');
    return count;
  } finally {
    client.release();
  }
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));

if (invokedDirectly) {
  runMigrations()
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error(error.message);
      await closePool();
      process.exit(1);
    });
}
