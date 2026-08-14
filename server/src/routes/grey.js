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
// Per-challan breakdown behind a lot's progress bar.
router.get('/:id/flow', greyController.flow);
router.post('/', greyController.create);
router.put('/:id', greyController.update);

// Closing a lot as finished is bookkeeping like an edit, not a delete, so it
// sits behind the page gate rather than requirePrivileged.
router.post('/:id/close', greyController.close);
router.delete('/:id/close', greyController.reopen);

// steps.md: grey/embroidery/handwork roles may add and edit but never delete.
router.delete('/bulk', requirePrivileged, greyController.removeMany);
router.delete('/:id', requirePrivileged, greyController.remove);

export default router;
