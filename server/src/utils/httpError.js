/** An error carrying an HTTP status, thrown by services and mapped by the error middleware. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Not signed in') => new HttpError(401, message);
export const forbidden = (message = 'You do not have access to this action') =>
  new HttpError(403, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);
export const conflict = (message, details) => new HttpError(409, message, details);

/** Wraps an async route handler so rejections reach the error middleware. */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
