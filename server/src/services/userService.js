import * as userRepository from '../repositories/userRepository.js';
import * as logService from './logService.js';
import { toUser, toUsers } from '../models/user.js';
import { ASSIGNABLE_ROLES, LOG_ACTIONS, ROLES, USER_STATUS } from '../config/constants.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';

export async function list(actor) {
  const rows = await userRepository.listAll();
  return {
    users: toUsers(rows),
    assignableRoles: ASSIGNABLE_ROLES[actor.role] ?? [],
  };
}

function assertCanAssign(actor, targetRole) {
  const allowed = ASSIGNABLE_ROLES[actor.role] ?? [];
  if (!allowed.includes(targetRole)) {
    throw forbidden(`Your role cannot assign the ${targetRole} role.`);
  }
}

/** Granting a role is also what approves a pending account. */
export async function setRole(req, id, role) {
  const target = await userRepository.findById(id);
  if (!target) throw notFound('That user no longer exists.');

  if (target.role === ROLES.ROOT) throw forbidden('The root user cannot be changed.');
  if (Number(id) === req.user.id) throw badRequest('You cannot change your own role.');

  assertCanAssign(req.user, role);

  const row = await userRepository.updateRole(id, role);

  await logService.record(req, {
    action: LOG_ACTIONS.ROLE_CHANGE,
    entity: 'user',
    entityId: Number(id),
    details: { email: target.email, from: target.role, to: role },
  });

  return toUser(row);
}

export async function remove(req, id) {
  const target = await userRepository.findById(id);
  if (!target) throw notFound('That user no longer exists.');

  if (target.role === ROLES.ROOT) throw forbidden('The root user cannot be removed.');
  if (Number(id) === req.user.id) throw badRequest('You cannot remove yourself.');

  // Owners may not remove other owners; only root can.
  if (target.role === ROLES.OWNER && req.user.role !== ROLES.ROOT) {
    throw forbidden('Only the root user can remove an owner.');
  }

  const row = await userRepository.updateStatus(id, USER_STATUS.REMOVED);

  await logService.record(req, {
    action: LOG_ACTIONS.USER_REMOVE,
    entity: 'user',
    entityId: Number(id),
    details: { email: target.email, role: target.role },
  });

  return toUser(row);
}
