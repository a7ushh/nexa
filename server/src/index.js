import { createApp } from './app.js';
import { env } from './config/env.js';
import { redirectUriProblem } from './config/google.js';
import { pool, closePool } from './config/db.js';

async function start() {
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error(
      `\nCannot reach PostgreSQL at ${env.db.host}:${env.db.port}/${env.db.database}\n  ${error.message}\n` +
        '  Start PostgreSQL and run "npm run setup" if you have not already.\n',
    );
    process.exit(1);
  }

  const app = await createApp();
  const server = app.listen(env.port, () => {
    console.log(`GRAG ERP listening on http://localhost:${env.port} (${env.nodeEnv})`);
    if (env.google.configured) {
      // Printed every boot: a redirect_uri_mismatch is always a mismatch
      // between this exact string and the Google Console entry.
      console.log(`  Google redirect URI: ${env.google.redirectUri}`);
      console.log('  This must be listed verbatim under "Authorised redirect URIs".');

      const problem = redirectUriProblem();
      if (problem) console.warn(`\n  Google sign-in will fail: ${problem}\n`);
    } else {
      console.warn('  Google sign-in is disabled: set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.');
    }
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down.`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
