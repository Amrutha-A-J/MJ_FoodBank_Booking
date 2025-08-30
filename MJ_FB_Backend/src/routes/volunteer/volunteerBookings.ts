import express from 'express';
import {
  createVolunteerBooking,
  listVolunteerBookings,
  listVolunteerBookingsByRole,
  listMyVolunteerBookings,
  listMyRecurringVolunteerBookings,
  listUnmarkedVolunteerBookings,
  updateVolunteerBookingStatus,
  listVolunteerBookingsByVolunteer,
  createVolunteerBookingForVolunteer,
  rescheduleVolunteerBooking,
  createRecurringVolunteerBooking,
  cancelRecurringVolunteerBooking,
  cancelVolunteerBookingOccurrence,
  resolveVolunteerBookingConflict,
} from '../../controllers/volunteer/volunteerBookingController';
import {
  authMiddleware,
  authorizeRoles,
  optionalAuthMiddleware,
} from '../../middleware/authMiddleware';
import { CreateRecurringVolunteerBookingRequest } from '../../types/volunteerBooking';

const router = express.Router();

router.post('/', authMiddleware, authorizeRoles('volunteer'), createVolunteerBooking);
router.post(
  '/staff',
  authMiddleware,
  authorizeRoles('staff'),
  createVolunteerBookingForVolunteer
);
router.post<{}, any, CreateRecurringVolunteerBookingRequest>(
  '/recurring',
  authMiddleware,
  authorizeRoles('volunteer'),
  createRecurringVolunteerBooking,
);
router.get(
  '/recurring',
  authMiddleware,
  authorizeRoles('volunteer'),
  listMyRecurringVolunteerBookings,
);
router.get('/mine', authMiddleware, authorizeRoles('volunteer'), listMyVolunteerBookings);
router.get(
  '/volunteer/:volunteer_id',
  authMiddleware,
  authorizeRoles('staff'),
  listVolunteerBookingsByVolunteer
);
router.get(
  '/unmarked',
  authMiddleware,
  authorizeRoles('staff'),
  listUnmarkedVolunteerBookings,
);
router.get('/', authMiddleware, authorizeRoles('staff'), listVolunteerBookings);
router.get('/:role_id', authMiddleware, authorizeRoles('staff'), listVolunteerBookingsByRole);
router.patch('/:id', authMiddleware, authorizeRoles('staff'), updateVolunteerBookingStatus);
router.post(
  '/reschedule/:token',
  optionalAuthMiddleware,
  rescheduleVolunteerBooking,
);
router.post(
  '/resolve-conflict',
  authMiddleware,
  authorizeRoles('volunteer'),
  resolveVolunteerBookingConflict,
);
router.patch(
  '/:id/cancel',
  authMiddleware,
  authorizeRoles('volunteer', 'staff'),
  cancelVolunteerBookingOccurrence,
);
router.delete(
  '/recurring/:id',
  authMiddleware,
  authorizeRoles('volunteer', 'staff'),
  cancelRecurringVolunteerBooking,
);

export default router;
