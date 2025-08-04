import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import {
  createBooking,
  listBookings,
  decideBooking,
  createPreapprovedBooking,
  createBookingForUser   // ✅ make sure to import this controller
} from '../controllers/bookingController';

const router = express.Router();

// Shopper/delivery create own booking
router.post('/', authMiddleware, authorizeRoles('shopper', 'delivery'), createBooking);

// Staff list all bookings
router.get('/', authMiddleware, authorizeRoles('staff'), listBookings);

// Staff approve/reject booking
router.post('/:id/decision', authMiddleware, authorizeRoles('staff'), decideBooking);

// Staff create preapproved booking for walk-in users
router.post('/preapproved', authMiddleware, authorizeRoles('staff'), createPreapprovedBooking);

// ✅ Staff create booking for existing user (what you need)
router.post('/staff', authMiddleware, authorizeRoles('staff'), createBookingForUser);

export default router;
