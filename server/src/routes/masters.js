import { Router } from 'express';
import * as masterController from '../controllers/masterController.js';
import { requireAuth, requireCompany, requirePrivileged } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireCompany);

// Every role needs to read masters: the Master Head field appears on all forms.
router.get('/', masterController.list);
router.get('/search', masterController.search);

router.post('/', masterController.create);
router.put('/:id', masterController.update);
router.delete('/:id', requirePrivileged, masterController.remove);

export default router;
