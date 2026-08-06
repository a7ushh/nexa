import * as masterService from '../services/masterService.js';
import { masterSchema, idParam } from '../validation/masterSchemas.js';
import { asyncHandler } from '../utils/httpError.js';

export const list = asyncHandler(async (req, res) => {
  res.json({ masters: await masterService.list(req.companyId) });
});

export const search = asyncHandler(async (req, res) => {
  const term = String(req.query.q ?? '').trim();
  res.json({ masters: term ? await masterService.search(req.companyId, term) : [] });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await masterService.create(req, masterSchema.parse(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await masterService.update(req, id, masterSchema.parse(req.body)));
});

export const remove = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  await masterService.remove(req, id);
  res.json({ ok: true });
});
