import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import {
  createBooking,
  listBookings,
  decideBooking,
  createPreapprovedBooking,
  createBookingForUser,   // ✅ make sure to import this controller
  getBookingHistory,
  cancelBooking
} from '../controllers/bookingController';

const router = express.Router();

// Shopper/delivery create own booking
router.post('/', authMiddleware, authorizeRoles('shopper', 'delivery'), createBooking);

// Staff list all bookings
router.get('/', authMiddleware, authorizeRoles('staff', 'volunteer_coordinator', 'admin'), listBookings);

// Booking history for user or staff lookup
router.get('/history', authMiddleware, getBookingHistory);

// Staff approve/reject booking
router.post('/:id/decision', authMiddleware, authorizeRoles('staff', 'volunteer_coordinator', 'admin'), decideBooking);

// Cancel booking (staff or user)
router.post('/:id/cancel', authMiddleware, cancelBooking);

// Staff create preapproved booking for walk-in users
router.post('/preapproved', authMiddleware, authorizeRoles('staff', 'volunteer_coordinator', 'admin'), createPreapprovedBooking);

// ✅ Staff create booking for existing user (what you need)
router.post('/staff', authMiddleware, authorizeRoles('staff', 'volunteer_coordinator', 'admin'), createBookingForUser);

export default router;
