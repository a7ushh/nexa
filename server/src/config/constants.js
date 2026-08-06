/**
 * Roles, permissions and shared vocabulary.
 * steps.md "Roles and permissions" is the source of truth for this file.
 */
import path from 'node:path';
import { serverDir } from './env.js';

/** Static files shipped with the server, e.g. the challan signature image. */
export const serverAssetsDir = path.join(serverDir, 'assets');

export const ROLES = Object.freeze({
  ROOT: 'root',
  OWNER: 'owner',
  ADMIN: 'admin',
  GREY: 'grey',
  EMBROIDERY: 'embroidery',
  HANDWORK: 'handwork',
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  REMOVED: 'removed',
});

export const WORK_KINDS = Object.freeze({ EMBROIDERY: 'embroidery', HANDWORK: 'handwork' });

/** Pages a role may open. */
export const PAGE_ACCESS = Object.freeze({
  [ROLES.ROOT]: ['grey', 'embroidery', 'handwork', 'report', 'master', 'users', 'log'],
  [ROLES.OWNER]: ['grey', 'embroidery', 'handwork', 'report', 'master', 'users'],
  [ROLES.ADMIN]: ['grey', 'embroidery', 'handwork', 'report', 'master'],
  [ROLES.GREY]: ['grey'],
  [ROLES.EMBROIDERY]: ['embroidery'],
  [ROLES.HANDWORK]: ['handwork'],
});

/** Roles that may delete rows and share challans. */
export const PRIVILEGED_ROLES = Object.freeze([ROLES.ROOT, ROLES.OWNER, ROLES.ADMIN]);

/** Which roles each role is allowed to assign on the Users page. */
export const ASSIGNABLE_ROLES = Object.freeze({
  [ROLES.ROOT]: [ROLES.OWNER, ROLES.ADMIN, ROLES.GREY, ROLES.EMBROIDERY, ROLES.HANDWORK],
  [ROLES.OWNER]: [ROLES.ADMIN, ROLES.GREY, ROLES.EMBROIDERY, ROLES.HANDWORK],
  [ROLES.ADMIN]: [],
  [ROLES.GREY]: [],
  [ROLES.EMBROIDERY]: [],
  [ROLES.HANDWORK]: [],
});

/** Module a role owns, used to gate write access to a specific table. */
export const ROLE_MODULE = Object.freeze({
  [ROLES.GREY]: 'grey',
  [ROLES.EMBROIDERY]: 'embroidery',
  [ROLES.HANDWORK]: 'handwork',
});

/** Actions written to activity_logs. */
export const LOG_ACTIONS = Object.freeze({
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SHARE: 'SHARE',
  BACKUP: 'BACKUP',
  ROLE_CHANGE: 'ROLE_CHANGE',
  USER_REMOVE: 'USER_REMOVE',
});

/** A grey lot older than this drops into "Past Operation". */
export const GREY_PAST_AFTER_DAYS = 30;

/** An issue challan not fully received after this many days is "Not Received". */
export const ISSUE_DEADLINE_DAYS = 7;

export const PIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 12;
