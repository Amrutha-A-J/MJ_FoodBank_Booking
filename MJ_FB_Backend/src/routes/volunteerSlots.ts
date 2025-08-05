import express from 'express';
import {
  addVolunteerSlot,
  listVolunteerSlots,
  updateVolunteerSlot,
  deleteVolunteerSlot,
  listVolunteerSlotsForVolunteer,
} from '../controllers/volunteerSlotController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { verifyVolunteerToken } from '../middleware/verifyVolunteerToken';

const router = express.Router();

router.get('/', authMiddleware, authorizeRoles('volunteer_coordinator'), listVolunteerSlots);

router.get('/mine', verifyVolunteerToken, listVolunteerSlotsForVolunteer);

router.post('/', authMiddleware, authorizeRoles('volunteer_coordinator'), addVolunteerSlot);
router.put('/:id', authMiddleware, authorizeRoles('volunteer_coordinator'), updateVolunteerSlot);
router.delete('/:id', authMiddleware, authorizeRoles('volunteer_coordinator'), deleteVolunteerSlot);

export default router;
