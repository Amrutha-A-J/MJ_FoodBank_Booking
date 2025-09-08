import { Router } from 'express';
import {
  requestPasswordReset,
  resendPasswordSetup,
  getPasswordSetupInfo,
  setPassword,
  changePassword,
  refreshToken,
  logout,
  csrfToken,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/request-password-reset', requestPasswordReset);
router.post('/resend-password-setup', resendPasswordSetup);
router.get('/password-setup-info', getPasswordSetupInfo);
router.post('/set-password', setPassword);
router.post('/change-password', authMiddleware, changePassword);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/csrf-token', csrfToken);

export default router;
