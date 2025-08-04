import express from 'express';
import { listSlots } from '../controllers/slotController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authMiddleware, listSlots);

export default router;
