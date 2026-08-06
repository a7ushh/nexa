import { z } from 'zod';
import { PIN_LENGTH, USERNAME_MAX_LENGTH } from '../config/constants.js';

const pin = z
  .string()
  .regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), `PIN must be exactly ${PIN_LENGTH} digits.`);

export const profileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'Username is required.')
      .max(USERNAME_MAX_LENGTH, `Username can be at most ${USERNAME_MAX_LENGTH} characters.`)
      .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, digits, dot, underscore or hyphen only.'),
    pin,
    confirmPin: pin,
  })
  .refine((value) => value.pin === value.confirmPin, {
    message: 'The two PINs do not match.',
    path: ['confirmPin'],
  });

export const pinSchema = z.object({ pin });
