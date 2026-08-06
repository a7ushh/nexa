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

  // Loopback only. The app is public exclusively through the Cloudflare tunnel,
  // and cloudflared runs on this same machine, so 127.0.0.1 is the only
  // interface that ever has to accept a connection. app.listen(port) with no
  // host binds 0.0.0.0, which also publishes the app to every device on the LAN.
  //
  // This drops the [::1] listener, so the tunnel's ingress must say
  // http://127.0.0.1:5000 rather than http://localhost:5000 - on Windows
  // "localhost" resolves to ::1 first.
  const server = app.listen(env.port, '127.0.0.1', () => {
    // The reachable address and the listening address are different things now,
    // and when the tunnel 502s you need to see both.
    console.log(`GRAG ERP live at ${env.appUrl} (${env.nodeEnv})`);
    console.log(`  bound to 127.0.0.1:${env.port} - not reachable from the LAN`);
    console.log(`  answering only for: ${env.allowedHosts.join(', ')}`);

    if (env.isHttps && !env.isProduction) {
      console.warn(
        '\n  APP_URL is public but NODE_ENV is not "production": the Vite dev server\n' +
          '  is being exposed through the tunnel. Run "npm run serve" instead.\n',
      );
    }

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
