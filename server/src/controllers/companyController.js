import { z } from 'zod';
import * as companyService from '../services/companyService.js';
import { asyncHandler } from '../utils/httpError.js';

/**
 * `address` and `phone` are the letterhead lines printed under the company
 * name on every challan; both are optional.
 */
const companySchema = z.object({
  name: z.string().trim().min(1, 'Company name is required.').max(120),
  address: z.string().trim().max(300).optional().default(''),
  phone: z.string().trim().max(120).optional().default(''),
});

const idSchema = z.coerce.number().int().positive();

export const list = asyncHandler(async (req, res) => {
  res.json({
    companies: await companyService.list(),
    canManage: companyService.canManage(req.user),
  });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await companyService.create(req, companySchema.parse(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  res.json(await companyService.update(req, id, companySchema.parse(req.body)));
});

export const select = asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  res.json(await companyService.select(req, id));
});
