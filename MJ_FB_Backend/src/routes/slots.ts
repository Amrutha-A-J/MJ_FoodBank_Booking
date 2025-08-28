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
import { validate, validateParams } from '../middleware/validate';
import {
  createSlotSchema,
  updateSlotSchema,
  slotIdParamSchema,
} from '../schemas/slotSchemas';

const router = express.Router();

router.get('/all', authMiddleware, authorizeRoles('staff'), listAllSlots);
router.get('/', authMiddleware, authorizeRoles('shopper', 'delivery', 'staff'), listSlots);
router.get('/range', authMiddleware, authorizeRoles('shopper', 'delivery', 'staff'), listSlotsRange);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(createSlotSchema), createSlot);
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('staff'),
  validateParams(slotIdParamSchema),
  validate(updateSlotSchema),
  updateSlot,
);
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('staff'),
  validateParams(slotIdParamSchema),
  deleteSlot,
);

export default router;
