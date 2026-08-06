import * as logRepository from '../repositories/logRepository.js';

/** Client IP for the log, honouring a proxy header when one is present. */
export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req.ip ?? null;
}

/**
 * Writes an audit row. Logging must never break the request that triggered it,
 * so failures are reported and swallowed.
 */
export async function record(req, { action, entity, entityId, details, companyId }) {
  try {
    await logRepository.insert({
      companyId: companyId ?? req.session?.companyId ?? null,
      userId: req.session?.userId ?? req.session?.pendingUserId ?? null,
      action,
      entity,
      entityId,
      details,
      ip: clientIp(req),
    });
  } catch (error) {
    console.error('[log] failed to record activity', error.message);
  }
}

export function list(options) {
  return logRepository.list(options);
}
