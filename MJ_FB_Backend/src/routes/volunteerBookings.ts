import express from 'express';
import {
  createVolunteerBooking,
  listVolunteerBookingsByRole,
  listMyVolunteerBookings,
  updateVolunteerBookingStatus,
} from '../controllers/volunteerBookingController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { verifyVolunteerToken } from '../middleware/verifyVolunteerToken';

const router = express.Router();

router.post('/', verifyVolunteerToken, createVolunteerBooking);
router.get('/mine', verifyVolunteerToken, listMyVolunteerBookings);
router.get('/:role_id', authMiddleware, authorizeRoles('volunteer_coordinator'), listVolunteerBookingsByRole);
router.patch('/:id', authMiddleware, authorizeRoles('volunteer_coordinator'), updateVolunteerBookingStatus);

export default router;
