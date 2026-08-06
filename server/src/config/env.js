import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { driveFolderId, normalizeOrigin } from '../utils/urls.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repository root: server/src/config -> server/src -> server -> <root> */
export const rootDir = path.resolve(here, '..', '..', '..');
export const serverDir = path.resolve(here, '..', '..');
export const clientDir = path.join(rootDir, 'client');
export const clientDistDir = path.join(clientDir, 'dist');

// `override` matters: server/.env is written by `npm run setup` and is the
// single source of truth for hosting. Without it an ambient PORT (which some
// dev runners inject) would silently move the API off the configured port.
dotenv.config({ path: path.join(serverDir, '.env'), override: true });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(
      `Missing environment variable ${name}. Run "npm run setup" or copy server/.env.example to server/.env.`,
    );
  }
  return value;
}

function optional(name, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function number(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new Error(`Environment variable ${name} must be a number.`);
  return parsed;
}

// Resolved once, at load: APP_URL cannot change while the process runs, and
// ALLOWED_HOSTS is consulted on every single request by middleware/hostGate.js.
//
// normalizeOrigin throws on a scheme-less value instead of guessing a scheme.
// That is the bug this app shipped with: APP_URL=nexasuits.online flowed into
// GOOGLE_REDIRECT_URI, and Google answers a redirect URI that is not an
// absolute https URL with `Error 400: invalid_request`. It also made isHttps
// false, dropping `secure` from the session cookie, and turned every
// post-sign-in res.redirect() into a relative path. Guessing https:// would
// paper over that case and silently break http://localhost:5000, where the
// cookie must *not* be secure. Refusing to start is right in both.
const APP_URL = normalizeOrigin(optional('APP_URL', 'http://localhost:5000'));

// Host, not hostname: a browser sends "localhost:5000" on a custom port but a
// bare "nexasuits.online" on the default 443.
const PUBLIC_HOST = new URL(APP_URL).host;
const BARE_HOST = PUBLIC_HOST.startsWith('www.') ? PUBLIC_HOST.slice(4) : PUBLIC_HOST;
const ALLOWED_HOSTS = Object.freeze([BARE_HOST, `www.${BARE_HOST}`]);

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  get isProduction() {
    return this.nodeEnv === 'production';
  },

  // The app is served from exactly one origin. In development Vite runs as
  // Express middleware on this same port, so nothing else ever listens.
  port: number('PORT', 5000),
  appUrl: APP_URL,

  /** True when the app is reached over https, e.g. behind the tunnel. */
  get isHttps() {
    return this.appUrl.startsWith('https://');
  },

  /** The Host header value that corresponds to APP_URL, port included. */
  publicHost: PUBLIC_HOST,

  /**
   * Every Host value middleware/hostGate.js will answer to. Cloudflare routes
   * both nexasuits.online and www.nexasuits.online at the same tunnel and the
   * tunnel does not rewrite Host, so both spellings reach us. Anything else -
   * localhost, a LAN address, a scanner hitting the box by raw IP - is refused.
   */
  allowedHosts: ALLOWED_HOSTS,

  db: {
    host: optional('PGHOST', 'localhost'),
    port: number('PGPORT', 6789),
    database: optional('PGDATABASE', 'grag_erp'),
    user: optional('PGUSER', 'postgres'),
    password: optional('PGPASSWORD', ''),
  },

  sessionSecret: required('SESSION_SECRET', 'grag-dev-session-secret-change-me'),
  jwtSecret: optional('JWT_SECRET', 'grag-dev-jwt-secret-change-me'),
  idleTimeoutMs: number('IDLE_TIMEOUT_MINUTES', 10) * 60 * 1000,

  google: {
    clientId: optional('GOOGLE_CLIENT_ID'),
    clientSecret: optional('GOOGLE_CLIENT_SECRET'),
    // Normalised because backupService passes it straight into `parents`, and a
    // pasted drive.google.com/drive/folders/<id> link is not a folder id.
    driveFolderId: driveFolderId(optional('GOOGLE_DRIVE_FOLDER_ID')),

    /**
     * Must match an "Authorised redirect URI" on the OAuth client character for
     * character, or Google answers with `Error 400: redirect_uri_mismatch`.
     *
     * Defaults to the API's own origin. Override with GOOGLE_REDIRECT_URI when
     * the URI already registered in the Google Console points elsewhere - for
     * example at the Vite dev origin, which proxies /api through to this server.
     */
    get redirectUri() {
      return optional('GOOGLE_REDIRECT_URI', `${env.appUrl}/api/auth/google/callback`);
    },
    get configured() {
      return Boolean(this.clientId && this.clientSecret);
    },
  },
};
