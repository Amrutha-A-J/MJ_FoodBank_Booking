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
import { loginUser } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { authLoginSchema } from '../schemas/userSchemas';

const router = Router();

router.post('/login', validate(authLoginSchema), loginUser);
router.post('/request-password-reset', requestPasswordReset);
router.post('/resend-password-setup', resendPasswordSetup);
router.get('/password-setup-info', getPasswordSetupInfo);
router.post('/set-password', setPassword);
router.post('/change-password', authMiddleware, changePassword);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/csrf-token', csrfToken);

export default router;
