import { Router } from 'express';
import { z } from 'zod';
import * as userService from '../services/userService.js';
import * as logService from '../services/logService.js';
import * as backupService from '../services/backupService.js';
import { requireAuth, requirePage } from '../middleware/auth.js';
import { ALL_ROLES } from '../config/constants.js';
import { asyncHandler } from '../utils/httpError.js';

const idParam = z.coerce.number().int().positive();
const roleSchema = z.object({ role: z.enum(ALL_ROLES) });

const router = Router();

router.use(requireAuth);

/* ----------------------------------------------------------------- users -- */

const users = Router();
users.use(requirePage('users'));

users.get(
  '/',
  asyncHandler(async (req, res) => res.json(await userService.list(req.user))),
);

users.put(
  '/:id/role',
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const { role } = roleSchema.parse(req.body);
    res.json(await userService.setRole(req, id, role));
  }),
);

users.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    res.json(await userService.remove(req, id));
  }),
);

// steps.md places the backup button on the users page.
users.post(
  '/backup',
  asyncHandler(async (req, res) => res.json(await backupService.run(req))),
);

/* ------------------------------------------------------------------ logs -- */

const logs = Router();
logs.use(requirePage('log'));

logs.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const offset = Number(req.query.offset) || 0;
    res.json({ logs: await logService.list({ limit, offset }) });
  }),
);

router.use('/users', users);
router.use('/logs', logs);

export default router;
