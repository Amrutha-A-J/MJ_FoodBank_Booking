import express from 'express';
import { listSlots, listAllSlots } from '../controllers/slotController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/all', authMiddleware, listAllSlots);
router.get('/', authMiddleware, listSlots);

export default router;
