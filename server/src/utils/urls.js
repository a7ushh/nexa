/**
 * URL rules shared by the running server and the setup script.
 *
 * Deliberately dependency-free - no dotenv, no config/env.js - because
 * setup/setup.js imports these while server/.env may still be wrong. env.js
 * now refuses to load a malformed APP_URL, and `npm run setup` is the tool you
 * run to repair one, so setup must never pull env.js in through the back door.
 */

/** The only hosts Google will accept a redirect URI on over plain http. */
export const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

/**
 * Parses an absolute http(s) URL, or returns null.
 *
 * The protocol is asserted explicitly rather than relying on `new URL` to
 * throw, because `new URL('localhost:5000')` does *not* throw - it parses as
 * protocol "localhost:" with pathname "5000". A bare try/catch therefore waves
 * through exactly the scheme-less shape this module exists to catch.
 */
export function parseUrl(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw ?? '').trim());
  } catch {
    return null;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
}

/** null when `raw` is a usable origin, otherwise a sentence saying why not. */
export function originProblem(raw) {
  return parseUrl(raw)
    ? null
    : `"${raw}" is not an absolute URL. Include the scheme - https://nexasuits.online ` +
        'for the public site, or http://localhost:5000 for a local-only install.';
}

/**
 * Scheme and host only: any path, query or trailing slash is dropped, because
 * callers concatenate their own paths onto this and the app is served from the
 * root. Throws rather than guessing a missing scheme - see env.js for why.
 */
export function normalizeOrigin(raw) {
  const parsed = parseUrl(raw);
  if (!parsed) throw new Error(originProblem(raw));
  return parsed.origin;
}

/** True when the URL points back at this machine, which Google exempts from https. */
export function isLoopbackOrigin(raw) {
  const parsed = parseUrl(raw);
  return Boolean(parsed) && LOOPBACK_HOSTS.includes(parsed.hostname);
}

/**
 * Google refuses a redirect URI that is not either https:// or a loopback
 * address, and answers with `Error 400: invalid_request` ("doesn't comply with
 * Google's OAuth 2.0 policy for keeping apps secure") rather than naming the
 * problem. Two ways to land there: a value with no scheme at all, such as
 * `nexasuits.online/api/auth/google/callback`, or a LAN address such as
 * http://192.168.1.20:5000.
 *
 * Returns null when the URI is fine, otherwise an explanation.
 */
export function redirectUriProblem(uri) {
  const parsed = parseUrl(uri);
  if (!parsed) return `"${uri}" is not an absolute http:// or https:// URL.`;

  if (parsed.protocol === 'https:') return null;
  if (LOOPBACK_HOSTS.includes(parsed.hostname)) return null;

  return (
    `Google will reject "${uri}". Over http it only accepts localhost or 127.0.0.1; ` +
    'anything else has to be https. Set APP_URL to http://localhost:<port> on the ' +
    'machine running the app, or put it behind a real https domain.'
  );
}

/**
 * Accepts either a bare Drive folder id or a pasted
 * https://drive.google.com/drive/folders/<id>?usp=sharing link.
 *
 * backupService puts this straight into `parents`, where a URL is not a folder
 * id and every backup fails against an unknown parent - a mistake server/.env
 * had already made once.
 */
export function driveFolderId(raw) {
  const text = String(raw ?? '').trim();
  const match = /\/folders\/([\w-]+)/.exec(text);
  return match ? match[1] : text;
}
