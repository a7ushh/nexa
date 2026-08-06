import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

/* eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity */
export function errorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    const details = error.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({ error: details[0]?.message || 'Invalid request', details });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, details: error.details });
  }

  // Malformed JSON body: express.json() throws a SyntaxError, which is the
  // client's mistake rather than ours.
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }

  // Unique violation surfaced from Postgres.
  if (error.code === '23505') {
    return res.status(409).json({ error: 'That value already exists.' });
  }

  console.error('[error]', error);
  res.status(500).json({
    error: 'Something went wrong.',
    ...(env.isProduction ? {} : { detail: error.message }),
  });
}
