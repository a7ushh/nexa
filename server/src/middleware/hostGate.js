import { env } from '../config/env.js';

/**
 * The app has exactly one address: APP_URL, reached through the Cloudflare
 * tunnel. Everything else is refused here - including a browser on this very
 * machine opening http://localhost:5000.
 *
 * Two defences, because neither is sufficient alone:
 *
 *   1. The listener binds 127.0.0.1 (server/src/index.js), so nothing off this
 *      machine can open a socket at all. That is the real boundary.
 *   2. This gate, so that a request arriving over loopback still cannot reach
 *      the app. The loopback listener cannot simply be removed: cloudflared
 *      runs on this same box and is the only thing that dials it.
 *
 * So the gate is a policy check rather than a security boundary. Anything that
 * can already reach loopback could forge these headers - which is exactly what
 * makes the curl smoke test in DEPLOY.md possible. The protection that matters
 * remains the 127.0.0.1 bind.
 *
 * Both conditions derive from APP_URL, never from a hardcoded domain. Setting
 * APP_URL back to http://localhost:5000 therefore re-opens local access as a
 * side effect, and there is no second switch to forget - which is why there is
 * no separate "allow localhost" flag.
 */
export function hostGate(req, res, next) {
  // Host is case-insensitive, and a fully qualified name may carry a trailing
  // dot. A request with no Host at all (HTTP/1.0, or a raw socket probe) can
  // never be the public host, so the empty string falls through to refuse().
  const host = (req.headers.host || '').toLowerCase().replace(/\.$/, '');

  if (!env.allowedHosts.includes(host)) {
    return refuse(req, res, `Host "${req.headers.host || '(none)'}" is not ${env.publicHost}`);
  }

  // `trust proxy` is set in app.js, so req.protocol reflects cloudflared's
  // X-Forwarded-Proto rather than the plain http of the loopback hop. Demanded
  // only when APP_URL is itself https, so a genuine localhost install still
  // works without special-casing.
  if (env.isHttps && req.protocol !== 'https') {
    return refuse(req, res, 'the request did not arrive over https');
  }

  next();
}

function refuse(req, res, reason) {
  // Logged, never silent. If a mistake in here takes the site down, the reason
  // has to appear on the terminal the operator is already watching - a browser
  // is no longer available to find out with.
  console.warn(`[hostGate] refused ${req.method} ${req.originalUrl}: ${reason}`);

  const message = `This server only answers requests for ${env.appUrl}.`;

  // 403 rather than 421 Misdirected Request: 421 is the better fit semantically
  // but RFC 9110 gives it retry semantics, and a permanently-421ing origin can
  // send clients into a retry loop through the Cloudflare edge.
  //
  // Matches errorHandler's { error } shape under /api; plain text elsewhere, so
  // a browser shows the sentence instead of downloading a JSON file.
  if (req.path.startsWith('/api')) {
    return res.status(403).json({ error: message });
  }
  res.status(403).type('text/plain').send(`${message}\n`);
}
