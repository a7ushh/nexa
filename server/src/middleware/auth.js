import * as userRepository from '../repositories/userRepository.js';
import { toUser } from '../models/user.js';
import { PAGE_ACCESS, PRIVILEGED_ROLES, USER_STATUS } from '../config/constants.js';
import { forbidden, unauthorized } from '../utils/httpError.js';
import { asyncHandler } from '../utils/httpError.js';

/**
 * Loads the signed-in user onto `req.user`. Everything behind this middleware
 * can assume an active account.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) throw unauthorized();

  const row = await userRepository.findById(userId);
  if (!row || row.status !== USER_STATUS.ACTIVE) {
    req.session.destroy(() => {});
    throw unauthorized('Your access has been withdrawn.');
  }

  req.user = toUser(row);
  next();
});

/** Restricts a route to an explicit list of roles. */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

/** Restricts a route to the roles that may delete and share (admin, owner, root). */
export const requirePrivileged = requireRole(...PRIVILEGED_ROLES);

/** Restricts a route to roles whose page list includes `page`. */
export const requirePage = (page) => (req, res, next) => {
  if (!req.user) return next(unauthorized());
  if (!PAGE_ACCESS[req.user.role]?.includes(page)) return next(forbidden());
  next();
};

/**
 * Requires a company to have been chosen, and exposes it as `req.companyId`.
 * Every business query is scoped through this value.
 */
export const requireCompany = (req, res, next) => {
  const companyId = req.session?.companyId;
  if (!companyId) {
    return next(forbidden('Choose a company before opening this page.'));
  }
  req.companyId = Number(companyId);
  next();
};
