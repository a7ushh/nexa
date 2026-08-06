import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

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

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  get isProduction() {
    return this.nodeEnv === 'production';
  },

  // The app is served from exactly one origin. In development Vite runs as
  // Express middleware on this same port, so nothing else ever listens.
  port: number('PORT', 5000),
  appUrl: optional('APP_URL', 'http://localhost:5000'),

  /** True when the app is reached over https, e.g. behind the tunnel. */
  get isHttps() {
    return this.appUrl.startsWith('https://');
  },

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
    driveFolderId: optional('GOOGLE_DRIVE_FOLDER_ID'),

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
