import * as companyRepository from '../repositories/companyRepository.js';
import * as logService from './logService.js';
import { toCompany, toCompanies } from '../models/company.js';
import { LOG_ACTIONS, PRIVILEGED_ROLES } from '../config/constants.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';

/**
 * Every approved user may work in any company; their role decides what they can
 * do once inside (steps.md describes roles, never per-company assignment).
 */
export async function list() {
  return toCompanies(await companyRepository.list());
}

export function canManage(user) {
  return PRIVILEGED_ROLES.includes(user.role);
}

export async function create(req, { name, address, phone }) {
  if (!canManage(req.user)) {
    throw forbidden('Only an admin, owner or root can add a company.');
  }

  const existing = await companyRepository.findByName(name);
  if (existing) throw badRequest('A company with that name already exists.');

  const row = await companyRepository.insert({ name, address, phone, createdBy: req.user.id });

  await logService.record(req, {
    action: LOG_ACTIONS.CREATE,
    entity: 'company',
    entityId: Number(row.id),
    details: { name },
    companyId: Number(row.id),
  });

  return toCompany(row);
}

/**
 * Name plus the letterhead that prints on every challan. Editing is limited to
 * the same roles that may create a company.
 */
export async function update(req, id, { name, address, phone }) {
  if (!canManage(req.user)) {
    throw forbidden('Only an admin, owner or root can edit a company.');
  }

  const current = await companyRepository.findById(id);
  if (!current) throw notFound('That company no longer exists.');

  const clash = await companyRepository.findByName(name);
  if (clash && Number(clash.id) !== Number(id)) {
    throw badRequest('A company with that name already exists.');
  }

  const row = await companyRepository.update(id, { name, address, phone });

  await logService.record(req, {
    action: LOG_ACTIONS.UPDATE,
    entity: 'company',
    entityId: Number(id),
    details: { before: current.name, after: row.name },
    companyId: Number(id),
  });

  return toCompany(row);
}

/** Puts the chosen company on the session; every later query is scoped to it. */
export async function select(req, companyId) {
  const row = await companyRepository.findById(companyId);
  if (!row) throw notFound('That company no longer exists.');

  req.session.companyId = Number(row.id);
  return toCompany(row);
}
