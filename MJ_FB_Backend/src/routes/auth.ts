import { Router } from 'express';
import {
  requestPasswordReset,
  changePassword,
  refreshToken,
  logout,
  csrfToken,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/request-password-reset', requestPasswordReset);
router.post('/change-password', authMiddleware, changePassword);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/csrf-token', csrfToken);

export default router;
