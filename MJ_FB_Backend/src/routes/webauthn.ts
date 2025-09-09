import { Router } from 'express';
import { registerCredential, verifyCredential } from '../controllers/webauthnController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', authMiddleware, registerCredential);
router.post('/verify', verifyCredential);

export default router;
