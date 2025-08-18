import { Router } from 'express';
import {
  requestPasswordReset,
  changePassword,
  refreshToken,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/request-password-reset', requestPasswordReset);
router.post('/change-password', authMiddleware, changePassword);
router.post('/refresh', refreshToken);

export default router;
