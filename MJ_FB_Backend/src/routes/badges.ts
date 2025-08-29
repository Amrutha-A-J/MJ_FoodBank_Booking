import express from 'express';
import { awardBadge } from '../controllers/badgeController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
router.post('/milestone', authMiddleware, awardBadge);
export default router;
