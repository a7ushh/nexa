import { Router } from 'express';
import { z } from 'zod';
import * as reportService from '../services/reportService.js';
import * as companyRepository from '../repositories/companyRepository.js';
import * as logService from '../services/logService.js';
import { renderReport } from '../utils/reportPdf.js';
import { requireAuth, requireCompany, requirePage } from '../middleware/auth.js';
import { LOG_ACTIONS } from '../config/constants.js';
import { asyncHandler } from '../utils/httpError.js';

/** Accepts a real boolean or the strings a query string carries. */
const flag = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => (value === undefined ? true : value === true || value === 'true'));

const filterSchema = z
  .object({
    lotNo: z.string().trim().optional(),
    challanNo: z.string().trim().optional(),
    masterHead: z.string().trim().optional(),
    fabric: z.string().trim().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    // Filter-panel toggles; a trade switched off is left out of the report.
    // Query strings are text, and `z.coerce.boolean('false')` is `true`, so the
    // string has to be compared explicitly.
    includeEmbroidery: flag,
    includeHandwork: flag,
  })
  .partial();

const router = Router();

router.use(requireAuth, requireCompany, requirePage('report'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await reportService.build(req.companyId, filterSchema.parse(req.query)));
  }),
);

/** The same report as a PDF, for download or direct share. */
router.post(
  '/pdf',
  asyncHandler(async (req, res) => {
    const filters = filterSchema.parse(req.body ?? {});
    const report = await reportService.build(req.companyId, filters);
    const company = await companyRepository.findById(req.companyId);

    const pdf = await renderReport({
      report,
      meta: { companyName: company?.name ?? 'GARG', filters },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `report-${stamp}.pdf`;

    await logService.record(req, {
      action: LOG_ACTIONS.SHARE,
      entity: 'report',
      details: { filters },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('X-Challan-Filename', filename);
    res.send(pdf);
  }),
);

export default router;
