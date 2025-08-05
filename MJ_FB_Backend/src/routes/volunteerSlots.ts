import express from 'express';
import {
  addVolunteerSlot,
  listVolunteerSlots,
  updateVolunteerSlot,
  deleteVolunteerSlot,
  listVolunteerSlotsForVolunteer,
} from '../controllers/volunteerSlotController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  if (req.user && req.user.role === 'volunteer_coordinator') {
    return listVolunteerSlots(req, res);
  }
  return listVolunteerSlotsForVolunteer(req, res);
});

router.post('/', authMiddleware, authorizeRoles('volunteer_coordinator'), addVolunteerSlot);
router.put('/:id', authMiddleware, authorizeRoles('volunteer_coordinator'), updateVolunteerSlot);
router.delete('/:id', authMiddleware, authorizeRoles('volunteer_coordinator'), deleteVolunteerSlot);

export default router;
