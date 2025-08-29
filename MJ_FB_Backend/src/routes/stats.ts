import express from 'express';
import { getStats } from '../controllers/statsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
router.get('/', authMiddleware, getStats);
export default router;
