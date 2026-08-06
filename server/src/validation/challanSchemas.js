import { z } from 'zod';

const optionalText = (max = 120) => z.string().trim().max(max).optional().default('');
const money = z.coerce.number().min(0);

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.');

/**
 * Embroidery dupatta: "yes", or when there is no dupatta, which finish it is
 * (diamond / chain / plain). Handwork ignores the field entirely.
 */
const dupatta = z.enum(['yes', 'diamond', 'chain', 'plain']).nullable().optional().default(null);

export const issueSchema = z.object({
  challanNo: z.string().trim().max(40).optional().default(''),
  date: dateString,
  lotId: z.coerce.number().int().positive({ message: 'Choose a lot number.' }),
  masterId: z.coerce.number().int().positive().nullable().optional().default(null),
  fabric: optionalText(),
  design: optionalText(),
  dupatta,
  dupQty: money.optional().default(0),
  quantity: money.optional().default(0),
  rate: money.optional().default(0),
});

export const receiveSchema = z.object({
  challanNo: z.string().trim().max(40).optional().default(''),
  retailChallanNo: optionalText(40),
  date: dateString,
  issueChallanId: z.coerce.number().int().positive({ message: 'Choose an issue challan number.' }),
  lotId: z.coerce.number().int().positive().nullable().optional().default(null),
  masterId: z.coerce.number().int().positive().nullable().optional().default(null),
  fabric: optionalText(),
  design: optionalText(),
  dupatta,
  dupQty: money.optional().default(0),
  quantity: money.optional().default(0),
  rate: money.optional().default(0),
  // Damaged and lost pieces are always deducted together.
  damageLoss: money.optional().default(0),
});

export const challanFilterSchema = z
  .object({
    lotNo: z.string().trim().optional(),
    challanNo: z.string().trim().optional(),
    masterHead: z.string().trim().optional(),
    fabric: z.string().trim().optional(),
    design: z.string().trim().optional(),
    dupatta: z.union([z.boolean(), z.enum(['true', 'false', ''])]).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .partial();

export const kindParam = z.enum(['embroidery', 'handwork']);
export const idParam = z.coerce.number().int().positive();
export const idListSchema = z.object({ ids: z.array(idParam).min(1) });
