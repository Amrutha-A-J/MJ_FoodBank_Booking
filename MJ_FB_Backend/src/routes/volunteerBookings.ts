import express from 'express';
import {
  createVolunteerBooking,
  listVolunteerBookingsByRole,
  updateVolunteerBookingStatus,
} from '../controllers/volunteerBookingController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', authMiddleware, authorizeRoles('volunteer'), createVolunteerBooking);
router.get('/:role_id', authMiddleware, authorizeRoles('volunteer_coordinator'), listVolunteerBookingsByRole);
router.patch('/:id', authMiddleware, authorizeRoles('volunteer_coordinator'), updateVolunteerBookingStatus);

export default router;
