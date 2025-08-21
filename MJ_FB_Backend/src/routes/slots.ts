import express from 'express';
import { listSlots, listAllSlots, listSlotsRange } from '../controllers/slotController';
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
router.get(
  '/range',
  authMiddleware,
  authorizeRoles('shopper', 'delivery', 'staff'),
  listSlotsRange,
);

export default router;
