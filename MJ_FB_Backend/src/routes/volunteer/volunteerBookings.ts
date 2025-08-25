import express from 'express';
import {
  createVolunteerBooking,
  listVolunteerBookings,
  listVolunteerBookingsByRole,
  listMyVolunteerBookings,
  updateVolunteerBookingStatus,
  listVolunteerBookingsByVolunteer,
  createVolunteerBookingForVolunteer,
  rescheduleVolunteerBooking,
  createRecurringVolunteerBooking,
  cancelRecurringVolunteerBooking,
  cancelVolunteerBookingOccurrence,
} from '../../controllers/volunteer/volunteerBookingController';
import {
  authMiddleware,
  authorizeRoles,
  optionalAuthMiddleware,
} from '../../middleware/authMiddleware';

const router = express.Router();

router.post('/', authMiddleware, authorizeRoles('volunteer'), createVolunteerBooking);
router.post(
  '/staff',
  authMiddleware,
  authorizeRoles('staff'),
  createVolunteerBookingForVolunteer
);
router.post(
  '/recurring',
  authMiddleware,
  authorizeRoles('volunteer'),
  createRecurringVolunteerBooking,
);
router.get('/mine', authMiddleware, authorizeRoles('volunteer'), listMyVolunteerBookings);
router.get(
  '/volunteer/:volunteer_id',
  authMiddleware,
  authorizeRoles('staff'),
  listVolunteerBookingsByVolunteer
);
router.get('/', authMiddleware, authorizeRoles('staff'), listVolunteerBookings);
router.get('/:role_id', authMiddleware, authorizeRoles('staff'), listVolunteerBookingsByRole);
router.patch('/:id', authMiddleware, authorizeRoles('staff'), updateVolunteerBookingStatus);
router.post(
  '/reschedule/:token',
  optionalAuthMiddleware,
  rescheduleVolunteerBooking,
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
