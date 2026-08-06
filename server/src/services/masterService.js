import * as masterRepository from '../repositories/masterRepository.js';
import * as recordService from './recordService.js';
import { toMaster, toMasters } from '../models/master.js';
import { LOG_ACTIONS } from '../config/constants.js';
import { badRequest, notFound } from '../utils/httpError.js';

const TABLE = 'masters';

export async function list(companyId) {
  return toMasters(await masterRepository.list(companyId));
}

export async function search(companyId, term) {
  return toMasters(await masterRepository.search(companyId, term));
}

export async function create(req, data) {
  const record = await recordService.perform(
    req,
    { action: LOG_ACTIONS.CREATE, entity: TABLE },
    async (client) => {
      const row = await masterRepository.insert(client, req.companyId, {
        ...data,
        userId: req.user.id,
      });
      return { record: toMaster(row), entityId: Number(row.id), details: { name: row.name } };
    },
  );
  return record;
}

export async function update(req, id, data) {
  return recordService.perform(
    req,
    { action: LOG_ACTIONS.UPDATE, entity: TABLE },
    async (client) => {
      const before = await masterRepository.findById(req.companyId, id, client);
      if (!before) throw notFound('That master no longer exists.');

      await recordService.snapshot(client, {
        table: TABLE,
        id,
        companyId: req.companyId,
        row: before,
        changedBy: req.user.id,
      });

      const row = await masterRepository.update(client, req.companyId, id, {
        ...data,
        userId: req.user.id,
      });

      return {
        record: toMaster(row),
        entityId: Number(id),
        details: { before: before.name, after: row.name },
      };
    },
  );
}

export async function remove(req, id) {
  const inUse = await masterRepository.usageCount(req.companyId, id);
  if (inUse > 0) {
    throw badRequest(`This master is used by ${inUse} record(s) and cannot be deleted.`);
  }

  return recordService.perform(
    req,
    { action: LOG_ACTIONS.DELETE, entity: TABLE },
    async (client) => {
      const before = await masterRepository.findById(req.companyId, id, client);
      if (!before) throw notFound('That master no longer exists.');

      await recordService.snapshot(client, {
        table: TABLE,
        id,
        companyId: req.companyId,
        row: before,
        changedBy: req.user.id,
      });

      const row = await masterRepository.softDelete(client, req.companyId, id, req.user.id);
      return { record: toMaster(row), entityId: Number(id), details: { name: before.name } };
    },
  );
}
