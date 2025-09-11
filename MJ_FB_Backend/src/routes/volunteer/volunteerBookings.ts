import express from 'express';
import {
  createVolunteerBooking,
  listVolunteerBookings,
  listVolunteerBookingsByRole,
  listMyVolunteerBookings,
  listMyRecurringVolunteerBookings,
  listUnmarkedVolunteerBookings,
  listVolunteerBookingsForReview,
  listVolunteerBookingsByDate,
  updateVolunteerBookingStatus,
  listVolunteerBookingsByVolunteer,
  createVolunteerBookingForVolunteer,
  rescheduleVolunteerBooking,
  getRescheduleVolunteerBooking,
  createRecurringVolunteerBooking,
  createRecurringVolunteerBookingForVolunteer,
  cancelRecurringVolunteerBooking,
  cancelVolunteerBookingOccurrence,
  listRecurringVolunteerBookingsByVolunteer,
  resolveVolunteerBookingConflict,
} from '../../controllers/volunteer/volunteerBookingController';
import {
  authMiddleware,
  authorizeRoles,
  optionalAuthMiddleware,
} from '../../middleware/authMiddleware';
import {
  CreateRecurringVolunteerBookingRequest,
  CreateRecurringVolunteerBookingForVolunteerRequest,
} from '../../types/volunteerBooking';

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
router.post<{}, any, CreateRecurringVolunteerBookingForVolunteerRequest>(
  '/recurring/staff',
  authMiddleware,
  authorizeRoles('staff'),
  createRecurringVolunteerBookingForVolunteer,
);
router.get(
  '/recurring',
  authMiddleware,
  authorizeRoles('volunteer'),
  listMyRecurringVolunteerBookings,
);
router.get(
  '/recurring/volunteer/:volunteer_id',
  authMiddleware,
  authorizeRoles('staff'),
  listRecurringVolunteerBookingsByVolunteer,
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
router.get(
  '/review',
  authMiddleware,
  authorizeRoles('staff'),
  listVolunteerBookingsForReview,
);
router.get(
  '/by-date',
  authMiddleware,
  authorizeRoles('staff'),
  listVolunteerBookingsByDate,
);
router.get('/', authMiddleware, authorizeRoles('staff'), listVolunteerBookings);
router.get('/:role_id', authMiddleware, authorizeRoles('staff'), listVolunteerBookingsByRole);
router.patch('/:id', authMiddleware, authorizeRoles('staff'), updateVolunteerBookingStatus);
router.post(
  '/reschedule/:token',
  optionalAuthMiddleware,
  rescheduleVolunteerBooking,
);
router.get(
  '/reschedule/:token',
  optionalAuthMiddleware,
  getRescheduleVolunteerBooking,
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
