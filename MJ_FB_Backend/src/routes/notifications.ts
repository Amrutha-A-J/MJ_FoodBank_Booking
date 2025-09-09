import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { registerPushToken } from '../controllers/notificationController';

const router = Router();

router.post('/register', authMiddleware, registerPushToken);

export default router;
