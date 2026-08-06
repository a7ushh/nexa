import { Router } from 'express';
import { z } from 'zod';
import * as suggestionRepository from '../repositories/suggestionRepository.js';
import { splitTerms } from '../repositories/filters.js';
import { requireAuth, requireCompany } from '../middleware/auth.js';
import { asyncHandler } from '../utils/httpError.js';

const schema = z.object({
  scope: z.enum(['grey', 'issue', 'receive', 'report']),
  kind: z.enum(['embroidery', 'handwork']).optional(),
  field: z.string().trim().min(1).max(40),
  q: z.string().optional().default(''),
});

const router = Router();

router.use(requireAuth, requireCompany);

/**
 * Values already present in the data for a given filter field.
 *
 * Filters accept several alternatives separated by `/`, so only the segment
 * being typed is used as the search term.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { scope, kind, field, q } = schema.parse(req.query);

    if (!suggestionRepository.isKnownField(scope, field)) {
      return res.json({ values: [] });
    }

    const segments = String(q).split('/');
    const term = segments[segments.length - 1].trim();
    const already = new Set(splitTerms(q).slice(0, -1).map((item) => item.toLowerCase()));

    const values = await suggestionRepository.suggest({
      scope,
      companyId: req.companyId,
      kind,
      field,
      term,
    });

    // Do not offer something the user has already added to the list.
    res.json({ values: values.filter((value) => !already.has(String(value).toLowerCase())) });
  }),
);

export default router;
