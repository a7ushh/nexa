import { Router } from 'express';
import { z } from 'zod';
import * as challanDocService from '../services/challanDocService.js';
import { requireAuth, requireCompany, requirePrivileged } from '../middleware/auth.js';
import { asyncHandler } from '../utils/httpError.js';

const schema = z.object({
  kind: z.enum(['embroidery', 'handwork']),
  direction: z.enum(['issue', 'receive']),
  ids: z.array(z.coerce.number().int().positive()).min(1),
  // Printed in place of the stored party for this one document. Blank means
  // "keep what the record says", so both are optional and may arrive empty.
  masterHead: z.string().trim().max(120).optional(),
  masterAddress: z.string().trim().max(300).optional(),
  masterPhone: z.string().trim().max(60).optional(),
});

const router = Router();

// steps.md limits sharing to admin, owner and root.
router.use(requireAuth, requireCompany, requirePrivileged);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { pdf, filename } = await challanDocService.generate(req, schema.parse(req.body));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('X-Challan-Filename', filename);
    res.send(pdf);
  }),
);

export default router;
