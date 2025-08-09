import express from 'express';
import { listSlots, listAllSlots } from '../controllers/slotController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.get(
  '/all',
  authMiddleware,
  authorizeRoles('staff'),
  listAllSlots,
);
router.get(
  '/',
  authMiddleware,
  authorizeRoles('shopper', 'delivery', 'staff'),
  listSlots,
);

export default router;
