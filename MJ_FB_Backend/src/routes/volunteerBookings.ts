import express from 'express';
import {
  createVolunteerBooking,
  listVolunteerBookingsByRole,
  listMyVolunteerBookings,
  updateVolunteerBookingStatus,
  listVolunteerBookingsByVolunteer,
  createVolunteerBookingForVolunteer,
} from '../controllers/volunteerBookingController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { verifyVolunteerToken } from '../middleware/verifyVolunteerToken';

const router = express.Router();

router.post('/', verifyVolunteerToken, createVolunteerBooking);
router.post(
  '/staff',
  authMiddleware,
  authorizeRoles('volunteer_coordinator'),
  createVolunteerBookingForVolunteer
);
router.get('/mine', verifyVolunteerToken, listMyVolunteerBookings);
router.get(
  '/volunteer/:volunteer_id',
  authMiddleware,
  authorizeRoles('volunteer_coordinator'),
  listVolunteerBookingsByVolunteer
);
router.get('/:role_id', authMiddleware, authorizeRoles('volunteer_coordinator'), listVolunteerBookingsByRole);
router.patch('/:id', authMiddleware, authorizeRoles('volunteer_coordinator'), updateVolunteerBookingStatus);

export default router;
