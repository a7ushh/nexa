import * as greyService from '../services/greyService.js';
import { greySchema, greyFilterSchema, idParam, idListSchema } from '../validation/greySchemas.js';
import { asyncHandler } from '../utils/httpError.js';

export const list = asyncHandler(async (req, res) => {
  const filters = greyFilterSchema.parse(req.query);
  res.json({ rows: await greyService.list(req.companyId, filters) });
});

export const search = asyncHandler(async (req, res) => {
  const term = String(req.query.q ?? '').trim();
  res.json({ rows: term ? await greyService.search(req.companyId, term) : [] });
});

export const history = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json({ revisions: await greyService.history(req.companyId, id) });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await greyService.create(req, greySchema.parse(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await greyService.update(req, id, greySchema.parse(req.body)));
});

export const remove = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  await greyService.remove(req, id);
  res.json({ ok: true });
});

export const removeMany = asyncHandler(async (req, res) => {
  const { ids } = idListSchema.parse(req.body);
  res.json({ removed: await greyService.removeMany(req, ids) });
});
