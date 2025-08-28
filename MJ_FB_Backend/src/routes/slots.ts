import express from 'express';
import {
  listSlots,
  listAllSlots,
  listSlotsRange,
  createSlot,
  updateSlot,
  deleteSlot,
} from '../controllers/slotController';
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

router.post('/', authMiddleware, authorizeRoles('staff'), createSlot);
router.put('/:id', authMiddleware, authorizeRoles('staff'), updateSlot);
router.delete('/:id', authMiddleware, authorizeRoles('staff'), deleteSlot);

export default router;
