import { Router } from 'express';
import * as companyController from '../controllers/companyController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', companyController.list);
router.post('/', companyController.create);
router.put('/:id', companyController.update);
router.post('/:id/select', companyController.select);

export default router;
