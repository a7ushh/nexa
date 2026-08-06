import pg from 'pg';
import { env } from './env.js';

const { Pool, types } = pg;

// Return NUMERIC as a JS number rather than a string - every numeric column in
// this schema is a quantity, rate or amount that the app arithmetic uses.
types.setTypeParser(types.builtins.NUMERIC, (value) => (value === null ? null : Number(value)));
// Return DATE as a plain YYYY-MM-DD string, free of timezone shifting.
types.setTypeParser(types.builtins.DATE, (value) => value);

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (error) => {
  console.error('[db] idle client error', error);
});

/** Run a single parameterised statement. */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Run `handler` inside a transaction, passing it a client whose `query` has the
 * same shape as the pool's. Rolls back on any throw.
 */
export async function withTransaction(handler) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
