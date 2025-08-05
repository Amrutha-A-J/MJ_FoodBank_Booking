import express, { Request, Response } from 'express';
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

// Wrapper to handle bookings created by staff or regular users
const handleCreateBooking = (req: Request, res: Response) => {
  if (req.user && ['staff', 'volunteer_coordinator'].includes(req.user.role)) {
    // Allow staff to create a booking for themselves or another user
    if (!req.body.userId) {
      req.body.userId = req.user.id;
    }
    return createBookingForUser(req, res);
  }
  return createBooking(req, res);
};

// Shopper/delivery or staff create booking
router.post(
  '/',
  authMiddleware,
  authorizeRoles('shopper', 'delivery', 'staff', 'volunteer_coordinator'),
  handleCreateBooking
);

// Staff list all bookings
router.get(
  '/',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator'),
  listBookings
);

// Booking history for user or staff lookup
router.get('/history', authMiddleware, getBookingHistory);

// Staff approve/reject booking
router.post(
  '/:id/decision',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator'),
  decideBooking
);

// Cancel booking (staff or user)
router.post('/:id/cancel', authMiddleware, cancelBooking);

// Staff create preapproved booking for walk-in users
router.post(
  '/preapproved',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator'),
  createPreapprovedBooking
);

// ✅ Staff create booking for existing user (what you need)
router.post(
  '/staff',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator'),
  createBookingForUser
);

export default router;
