import express from 'express';
import {
  addVolunteerSlot,
  listVolunteerSlots,
  updateVolunteerSlot,
  deleteVolunteerSlot,
} from '../controllers/volunteerSlotController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware, authorizeRoles('volunteer_coordinator'));

router.post('/', addVolunteerSlot);
router.get('/', listVolunteerSlots);
router.put('/:id', updateVolunteerSlot);
router.delete('/:id', deleteVolunteerSlot);

export default router;
