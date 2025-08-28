import express, { Request, Response, NextFunction } from 'express';
import {
  authMiddleware,
  authorizeRoles,
  optionalAuthMiddleware,
} from '../middleware/authMiddleware';
import {
  createBooking,
  listBookings,
  decideBooking,
  createPreapprovedBooking,
  createBookingForUser,   // ✅ make sure to import this controller
  getBookingHistory,
  cancelBooking,
  rescheduleBooking,
  markBookingNoShow,
  markBookingVisited
} from '../controllers/bookingController';

const router = express.Router();

// Wrapper to handle bookings created by staff or regular users
const handleCreateBooking = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'staff' || req.user.role === 'agency')) {
    // Allow staff to create a booking for themselves or another user
    if (req.user.role === 'staff' && !req.body.userId) {
      req.body.userId = req.user.id;
    }
    return createBookingForUser(req, res, next);
  }
  return createBooking(req, res, next);
};

// Shopper/delivery or staff create booking
router.post(
  '/',
  authMiddleware,
  authorizeRoles('shopper', 'delivery', 'staff', 'agency'),
  handleCreateBooking
);

// Staff list all bookings
router.get(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  listBookings
);

// Booking history for user or staff lookup
router.get('/history', authMiddleware, getBookingHistory);

// Staff approve/reject booking
router.post(
  '/:id/decision',
  authMiddleware,
  authorizeRoles('staff'),
  decideBooking
);

// Cancel booking (staff or user)
router.post('/:id/cancel', authMiddleware, cancelBooking);

// Mark booking as no-show or visited
router.post(
  '/:id/no-show',
  authMiddleware,
  authorizeRoles('staff'),
  markBookingNoShow,
);

router.post(
  '/:id/visited',
  authMiddleware,
  authorizeRoles('staff'),
  markBookingVisited,
);

// Reschedule booking by token
router.post('/reschedule/:token', optionalAuthMiddleware, rescheduleBooking);

// Staff create preapproved booking for walk-in users
router.post(
  '/preapproved',
  authMiddleware,
  authorizeRoles('staff'),
  createPreapprovedBooking
);

// ✅ Staff create booking for existing user (what you need)
router.post(
  '/staff',
  authMiddleware,
  authorizeRoles('staff', 'agency'),
  createBookingForUser
);

export default router;
