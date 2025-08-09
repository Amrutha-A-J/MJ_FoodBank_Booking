import express from 'express';
import {
  createVolunteerBooking,
  listVolunteerBookingsByRole,
  listMyVolunteerBookings,
  updateVolunteerBookingStatus,
  listVolunteerBookingsByVolunteer,
  createVolunteerBookingForVolunteer,
  rescheduleVolunteerBooking,
} from '../controllers/volunteerBookingController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', authMiddleware, authorizeRoles('volunteer'), createVolunteerBooking);
router.post(
  '/staff',
  authMiddleware,
  authorizeRoles('volunteer_coordinator'),
  createVolunteerBookingForVolunteer
);
router.get('/mine', authMiddleware, authorizeRoles('volunteer'), listMyVolunteerBookings);
router.get(
  '/volunteer/:volunteer_id',
  authMiddleware,
  authorizeRoles('volunteer_coordinator'),
  listVolunteerBookingsByVolunteer
);
router.get('/:role_id', authMiddleware, authorizeRoles('volunteer_coordinator'), listVolunteerBookingsByRole);
router.patch('/:id', authMiddleware, authorizeRoles('volunteer_coordinator'), updateVolunteerBookingStatus);
router.post('/reschedule/:token', rescheduleVolunteerBooking);

export default router;
