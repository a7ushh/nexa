import { z } from 'zod';

const optionalText = (max = 120) => z.string().trim().max(max).optional().default('');

export const greySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.'),
  masterId: z.coerce.number().int().positive().nullable().optional().default(null),
  fabric: optionalText(),
  chart: optionalText(),
  cut: optionalText(),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative.'),
  // "no" or, when the answer is yes, which kind of dupatta it is.
  dupatta: z.enum(['no', 'tone', 'contrast']).default('no'),
  bottom: z.coerce.boolean().default(false),
});

export const greyFilterSchema = z
  .object({
    lotNo: z.string().trim().optional(),
    masterHead: z.string().trim().optional(),
    fabric: z.string().trim().optional(),
    chart: z.string().trim().optional(),
    dupatta: z.union([z.boolean(), z.enum(['true', 'false', ''])]).optional(),
    bottom: z.union([z.boolean(), z.enum(['true', 'false', ''])]).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .partial();

export const idParam = z.coerce.number().int().positive();
export const idListSchema = z.object({ ids: z.array(idParam).min(1) });
