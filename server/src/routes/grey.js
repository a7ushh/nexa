import { Router } from 'express';
import * as greyController from '../controllers/greyController.js';
import {
  requireAuth,
  requireCompany,
  requirePage,
  requirePrivileged,
} from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireCompany);

// The lot type-ahead is used by the embroidery and handwork challan forms, so
// it sits outside the grey-page gate.
router.get('/search', greyController.search);

router.use(requirePage('grey'));

router.get('/', greyController.list);
router.get('/:id/history', greyController.history);
router.post('/', greyController.create);
router.put('/:id', greyController.update);

// steps.md: grey/embroidery/handwork roles may add and edit but never delete.
router.delete('/bulk', requirePrivileged, greyController.removeMany);
router.delete('/:id', requirePrivileged, greyController.remove);

export default router;
