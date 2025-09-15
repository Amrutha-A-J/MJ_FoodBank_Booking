import express, { Request, Response, NextFunction } from 'express';
import {
  authMiddleware,
  authorizeRoles,
  optionalAuthMiddleware,
} from '../middleware/authMiddleware';
import {
  createBooking,
  listBookings,
  createPreapprovedBooking,
  createBookingForUser,   // ✅ make sure to import this controller
  createBookingForNewClient,
  getBookingHistory,
  cancelBooking,
  cancelBookingByToken,
  rescheduleBooking,
  getRescheduleBooking,
  markBookingNoShow,
  markBookingVisited
} from '../controllers/bookingController';

const router = express.Router();

// Wrapper to handle bookings created by staff or regular users (supports optional note)
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

// Shopper, staff, or agency create booking
router.post(
  '/',
  authMiddleware,
  authorizeRoles('shopper', 'staff', 'agency'),
  handleCreateBooking
);

// Staff or agency list bookings
router.get(
  '/',
  authMiddleware,
  authorizeRoles('staff', 'agency'),
  listBookings
);


// Booking history for user or staff lookup
// Optional query params: status, past=true, userId (staff/agency), includeVisits=true, includeStaffNotes=true (agency only)
router.get('/history', authMiddleware, getBookingHistory);

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
router.get('/reschedule/:token', optionalAuthMiddleware, getRescheduleBooking);
router.post('/reschedule/:token', optionalAuthMiddleware, rescheduleBooking);

// Cancel booking by token
router.post('/cancel/:token', optionalAuthMiddleware, cancelBookingByToken);

// Staff create walk-in booking (auto-approved)
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

// Booking for new client without account
router.post(
  '/new-client',
  authMiddleware,
  authorizeRoles('staff', 'agency'),
  createBookingForNewClient
);

export default router;
