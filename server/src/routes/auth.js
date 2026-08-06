import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.get('/config', authController.config);
router.get('/me', authController.me);
router.get('/google', authController.googleStart);
router.get('/google/callback', authController.googleCallback);
router.get('/google/drive', requireAuth, requireRole(ROLES.ROOT), authController.googleConnectDrive);
router.post('/profile', authController.setProfile);
router.post('/pin', authController.verifyPin);
router.post('/logout', authController.logout);

export default router;
