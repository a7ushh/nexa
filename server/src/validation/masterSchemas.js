import { z } from 'zod';

export const masterSchema = z.object({
  name: z.string().trim().min(1, 'Master head name is required.').max(120),
  mobile: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, 'Mobile number may only contain digits and + - ( ).')
    .optional()
    .default(''),
  address: z.string().trim().max(500).optional().default(''),
});

export const idParam = z.coerce.number().int().positive();
