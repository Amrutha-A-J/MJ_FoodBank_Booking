import { Router } from 'express';
import { requestPasswordReset, changePassword } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/request-password-reset', requestPasswordReset);
router.post('/change-password', authMiddleware, changePassword);

export default router;
