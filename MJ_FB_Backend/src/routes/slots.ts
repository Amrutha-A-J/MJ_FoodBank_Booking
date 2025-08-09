import express from 'express';
import { listSlots, listAllSlots } from '../controllers/slotController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.get(
  '/all',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator'),
  listAllSlots,
);
router.get(
  '/',
  authMiddleware,
  authorizeRoles('shopper', 'delivery', 'staff', 'volunteer_coordinator'),
  listSlots,
);

export default router;
