/**
 * Seeds the single root user.
 *
 * steps.md: "their can only be one root user that is provided by sql command by
 * developer". The setup script runs this; it can also be run standalone.
 *
 *   node server/src/db/seedRoot.js
 *
 * Values come from ROOT_EMAIL / ROOT_NAME / ROOT_USERNAME / ROOT_PIN in
 * server/.env. Re-running updates the existing root instead of creating a second.
 */
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { pool, closePool } from '../config/db.js';
import { PIN_LENGTH, USERNAME_MAX_LENGTH } from '../config/constants.js';

export async function seedRoot({
  email = process.env.ROOT_EMAIL,
  name = process.env.ROOT_NAME || 'Root',
  username = process.env.ROOT_USERNAME || 'root',
  pin = process.env.ROOT_PIN,
} = {}) {
  if (!email) throw new Error('ROOT_EMAIL is required to seed the root user.');
  if (!pin || !new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) {
    throw new Error(`ROOT_PIN must be exactly ${PIN_LENGTH} digits.`);
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    throw new Error(`ROOT_USERNAME must be at most ${USERNAME_MAX_LENGTH} characters.`);
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (email, name, username, pin_hash, role, status)
     VALUES ($1, $2, $3, $4, 'root', 'active')
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           username = EXCLUDED.username,
           pin_hash = EXCLUDED.pin_hash,
           role = 'root',
           status = 'active',
           updated_at = now()
     RETURNING id, email, username, role, status`,
    [email.toLowerCase(), name, username, pinHash],
  );

  return rows[0];
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));

if (invokedDirectly) {
  seedRoot()
    .then((user) => {
      console.log(`  root user ready: ${user.email} (username "${user.username}")`);
      return closePool();
    })
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error(error.message);
      await closePool();
      process.exit(1);
    });
}
