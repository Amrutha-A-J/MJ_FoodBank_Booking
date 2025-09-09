import { Router } from 'express';
import {
  generateChallenge,
  registerCredential,
  verifyCredential,
} from '../controllers/webauthnController';

const router = Router();

router.post('/challenge', generateChallenge);
router.post('/register', registerCredential);
router.post('/verify', verifyCredential);

export default router;
