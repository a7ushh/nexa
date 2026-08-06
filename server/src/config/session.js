import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db.js';
import { env } from './env.js';

const PgStore = connectPgSimple(session);

/**
 * Session policy from steps.md:
 *   "session/cookies expires if they close the browser or 10mins of inactive"
 *
 * - no `maxAge` on the cookie => a browser-session cookie, gone when the
 *   browser closes;
 * - `rolling` + a server-side `expire` 10 minutes ahead => idle timeout that
 *   refreshes on every request.
 */
export const sessionMiddleware = session({
  name: 'grag.sid',
  store: new PgStore({ pool, tableName: 'session', createTableIfMissing: false }),
  secret: env.sessionSecret,
  resave: false,
  rolling: true,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    // Intentionally no maxAge: the cookie dies with the browser session.
    // The server enforces the idle window via `expires` on the store record.
  },
});

/**
 * Enforces the idle window. express-session's store TTL follows cookie.maxAge,
 * which we deliberately leave unset, so the timestamp is tracked in the session
 * itself and checked on every request.
 */
export function idleTimeout(req, res, next) {
  if (!req.session?.userId) return next();

  const now = Date.now();
  const last = req.session.lastSeenAt ?? now;

  if (now - last > env.idleTimeoutMs) {
    return req.session.destroy(() => {
      res.clearCookie('grag.sid');
      res.status(401).json({ error: 'Session expired after inactivity.', code: 'SESSION_IDLE' });
    });
  }

  req.session.lastSeenAt = now;
  next();
}
