import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { registerToken } from '../controllers/notificationController';

const router = Router();

router.post('/register', authMiddleware, registerToken);

export default router;
