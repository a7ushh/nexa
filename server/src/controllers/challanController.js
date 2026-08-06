import * as challanService from '../services/challanService.js';
import {
  issueSchema,
  receiveSchema,
  challanFilterSchema,
  kindParam,
  idParam,
  idListSchema,
} from '../validation/challanSchemas.js';
import { asyncHandler } from '../utils/httpError.js';

/** The trade comes from the mount path (/api/embroidery, /api/handwork). */
const kindOf = (req) => kindParam.parse(req.baseUrl.split('/').filter(Boolean).pop());

export const listIssues = asyncHandler(async (req, res) => {
  const filters = challanFilterSchema.parse(req.query);
  res.json({ rows: await challanService.listIssues(req.companyId, kindOf(req), filters) });
});

export const searchIssues = asyncHandler(async (req, res) => {
  const term = String(req.query.q ?? '').trim();
  res.json({
    rows: term ? await challanService.searchIssues(req.companyId, kindOf(req), term) : [],
  });
});

export const nextIssueNo = asyncHandler(async (req, res) => {
  res.json({ challanNo: await challanService.suggestIssueNo(req.companyId, kindOf(req)) });
});

export const nextReceiveNo = asyncHandler(async (req, res) => {
  res.json({ challanNo: await challanService.suggestReceiveNo(req.companyId, kindOf(req)) });
});

export const issueHistory = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json({ revisions: await challanService.issueHistory(req.companyId, kindOf(req), id) });
});

export const createIssue = asyncHandler(async (req, res) => {
  res.status(201).json(await challanService.createIssue(req, kindOf(req), issueSchema.parse(req.body)));
});

export const updateIssue = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await challanService.updateIssue(req, kindOf(req), id, issueSchema.parse(req.body)));
});

export const removeIssue = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  await challanService.removeIssue(req, kindOf(req), id);
  res.json({ ok: true });
});

export const removeIssues = asyncHandler(async (req, res) => {
  const { ids } = idListSchema.parse(req.body);
  res.json({ removed: await challanService.removeMany(req, kindOf(req), 'issue', ids) });
});

export const listReceives = asyncHandler(async (req, res) => {
  const filters = challanFilterSchema.parse(req.query);
  res.json({ rows: await challanService.listReceives(req.companyId, kindOf(req), filters) });
});

export const receiveHistory = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json({ revisions: await challanService.receiveHistory(req.companyId, kindOf(req), id) });
});

export const createReceive = asyncHandler(async (req, res) => {
  res
    .status(201)
    .json(await challanService.createReceive(req, kindOf(req), receiveSchema.parse(req.body)));
});

export const updateReceive = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  res.json(await challanService.updateReceive(req, kindOf(req), id, receiveSchema.parse(req.body)));
});

export const removeReceive = asyncHandler(async (req, res) => {
  const id = idParam.parse(req.params.id);
  await challanService.removeReceive(req, kindOf(req), id);
  res.json({ ok: true });
});

export const removeReceives = asyncHandler(async (req, res) => {
  const { ids } = idListSchema.parse(req.body);
  res.json({ removed: await challanService.removeMany(req, kindOf(req), 'receive', ids) });
});
