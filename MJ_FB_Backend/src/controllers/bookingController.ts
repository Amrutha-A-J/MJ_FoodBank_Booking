import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db';
import { formatReginaDate } from '../utils/dateUtils';
import {
  isDateWithinCurrentOrNextMonth,
  countApprovedBookingsForMonth,
  LIMIT_MESSAGE,
  findUpcomingBooking,
} from '../utils/bookingUtils';
import { enqueueEmail } from '../utils/emailQueue';
import logger from '../utils/logger';
import {
  SlotCapacityError,
  checkSlotCapacity,
  insertBooking,
  fetchBookings as repoFetchBookings,
  fetchBookingById,
  updateBooking,
  fetchBookingByToken,
  fetchBookingHistory as repoFetchBookingHistory,
  insertWalkinUser,
} from '../models/bookingRepository';
import { isAgencyClient } from '../models/agency';

// --- Create booking for logged-in shopper ---
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { slotId, date, isStaffBooking } = req.body;
  if (!slotId || !date) {
    return res.status(400).json({ message: 'Please select a time slot and date' });
  }

  const slotIdNum = Number(slotId);
  if (Number.isNaN(slotIdNum)) {
    return res.status(400).json({ message: 'Please select a valid time slot' });
  }

  try {
    const userId = Number((req.user as any).userId ?? req.user?.id);
    if (!isDateWithinCurrentOrNextMonth(date)) {
      return res.status(400).json({ message: 'Please choose a valid date' });
    }

    const approvedCount = await countApprovedBookingsForMonth(userId, date);
    if (approvedCount >= 2) {
      return res.status(400).json({ message: LIMIT_MESSAGE });
    }

    const upcoming = await findUpcomingBooking(userId);
    if (upcoming) {
      return res
        .status(409)
        .json({ message: 'You already have a booking scheduled', existingBooking: upcoming });
    }

    const client = await pool.connect();
    let token: string | undefined;
    const status = isStaffBooking ? 'approved' : 'submitted';
    try {
      await client.query('BEGIN');
      await checkSlotCapacity(slotIdNum, date, client);
      token = randomUUID();
      await insertBooking(
        userId,
        slotIdNum,
        status,
        '',
        date,
        isStaffBooking || false,
        token,
        client,
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof SlotCapacityError) {
        client.release();
        return res.status(err.status).json({ message: err.message });
      }
      client.release();
      throw err;
    }
    client.release();

    enqueueEmail(
      user.email || 'test@example.com',
      'Appointment request received',
      `Booking request submitted for ${date}`,
    );
    const countRes = await pool.query('SELECT bookings_this_month FROM clients WHERE id=$1', [userId]);
    const bookingsThisMonth = countRes.rows[0]?.bookings_this_month ?? 0;
    res
      .status(201)
      .json({ message: 'Booking created', bookingsThisMonth, rescheduleToken: token });
  } catch (error: any) {
    logger.error('Error creating booking:', error);
    return next(error);
  }
}

// --- List all bookings (for staff) ---
export async function listBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const status = (req.query.status as string)?.toLowerCase();
    const rows = await repoFetchBookings(status);
    res.json(rows);
  } catch (error) {
    logger.error('Error listing bookings:', error);
    next(error);
  }
}

// --- Approve or reject booking ---
export async function decideBooking(req: Request, res: Response, next: NextFunction) {
  const bookingId = req.params.id;
  const decision = (req.body.decision as string)?.toLowerCase();
  const reason = ((req.body.reason as string) || '').trim();

  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be approve or reject' });
  }
  if (decision === 'reject' && !reason) {
    return res.status(400).json({ message: 'Reason required for rejection' });
  }

  try {
    const booking = await fetchBookingById(Number(bookingId));
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'submitted') {
      return res.status(400).json({ message: 'Booking already processed' });
    }

    if (decision === 'approve') {
      if (!isDateWithinCurrentOrNextMonth(booking.date)) {
        return res
          .status(400)
          .json({ message: 'Booking date must be within this month or next' });
      }
      const approvedCount = await countApprovedBookingsForMonth(booking.user_id, booking.date);
      if (approvedCount >= 2) {
        return res.status(400).json({ message: LIMIT_MESSAGE });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await checkSlotCapacity(booking.slot_id, booking.date, client);
        await updateBooking(Number(bookingId), {
          status: 'approved',
          request_data: reason,
        }, client);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        if (err instanceof SlotCapacityError) {
          client.release();
          return res.status(err.status).json({ message: err.message });
        }
        client.release();
        throw err;
      }
      client.release();
    } else {
      await updateBooking(Number(bookingId), {
        status: 'rejected',
        request_data: reason,
      });
    }

    enqueueEmail(
      'test@example.com',
      `Booking ${decision}d`,
      `Booking ${bookingId} has been ${decision}d`,
    );

    res.json({ message: `Booking ${decision}d` });
  } catch (error: any) {
    logger.error('Error deciding booking:', error);
    next(error);
  }
}

// --- Cancel booking (staff or user) ---
export async function cancelBooking(req: Request, res: Response, next: NextFunction) {
  const bookingId = req.params.id;
  const requester = req.user;
  if (!requester) return res.status(401).json({ message: 'Unauthorized' });
  const reason =
    requester.role === 'staff' ? (req.body.reason as string) || '' : 'user cancelled';

  try {
    const booking = await fetchBookingById(Number(bookingId));
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const requesterId = Number((requester as any).userId ?? requester.id);
    if (requester.role !== 'staff' && booking.user_id !== requesterId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!['submitted', 'approved'].includes(booking.status)) {
      return res.status(400).json({ message: 'Only pending or approved bookings can be cancelled' });
    }

    const todayStr = formatReginaDate(new Date());
    if (booking.date < todayStr) {
      return res.status(400).json({ message: "You can't cancel past bookings" });
    }

    await updateBooking(Number(bookingId), { status: 'cancelled', request_data: reason });

    enqueueEmail(
      'test@example.com',
      'Booking cancelled',
      `Booking ${bookingId} was cancelled`,
    );

    res.json({ message: 'Booking cancelled' });
  } catch (error: any) {
    logger.error('Error cancelling booking:', error);
    next(error);
  }
}

// --- Reschedule booking using token ---
export async function rescheduleBooking(req: Request, res: Response, next: NextFunction) {
  const { token } = req.params;
  const { slotId, date } = req.body as { slotId?: number; date?: string };
  if (!slotId || !date) {
    return res.status(400).json({ message: 'Please select a time slot and date' });
  }
  try {
    const booking = await fetchBookingByToken(token);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!['submitted', 'approved', 'preapproved'].includes(booking.status)) {
      return res.status(400).json({ message: "This booking can't be rescheduled" });
    }
    if (!isDateWithinCurrentOrNextMonth(date)) {
      return res.status(400).json({ message: 'Please choose a valid date' });
    }
    await checkSlotCapacity(slotId, date);
    const newToken = randomUUID();
    const isStaffReschedule = req.user && req.user.role === 'staff';
    const newStatus = isStaffReschedule ? booking.status : 'submitted';
    await updateBooking(booking.id, {
      slot_id: slotId,
      date,
      reschedule_token: newToken,
      status: newStatus,
    });

    enqueueEmail(
      'test@example.com',
      'Booking rescheduled',
      `Booking ${booking.id} was rescheduled`,
    );

    res.json({ message: 'Booking rescheduled', rescheduleToken: newToken });
  } catch (error: any) {
    logger.error('Error rescheduling booking:', error);
    next(error);
  }
}

// --- Staff: create preapproved booking for walk-in user ---
export async function createPreapprovedBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user || req.user.role !== 'staff')
    return res.status(403).json({ message: 'Forbidden' });

  const { name, slotId, requestData, date } = req.body;
  if (!name || !slotId || !date) {
    return res
      .status(400)
      .json({ message: 'Please provide a name, time slot, and date' });
  }

  if (!isDateWithinCurrentOrNextMonth(date)) {
    return res.status(400).json({ message: 'Please choose a valid date' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // create dummy user with fake email and generated client ID
    const fakeEmail = `walkin_${Date.now()}@dummy.local`;
    const [firstName, ...lastParts] = name.split(' ');
    const lastName = lastParts.join(' ');
    const clientId = Math.floor(Math.random() * 9999999) + 1;
    const newUserId = await insertWalkinUser(
      firstName,
      lastName,
      fakeEmail,
      clientId,
      client,
    );

    const approvedCount = await countApprovedBookingsForMonth(newUserId, date);
    if (approvedCount >= 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: LIMIT_MESSAGE });
    }

    await checkSlotCapacity(slotId, date, client);
    const token = randomUUID();

    await insertBooking(
      newUserId,
      slotId,
      'approved',
      requestData || '',
      date,
      true,
      token,
      client,
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Preapproved booking created', rescheduleToken: token });
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Error creating preapproved booking:', error);
    next(error);
  } finally {
    client.release();
  }
}

// --- Staff: create booking for existing user ---
export async function createBookingForUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user || (req.user.role !== 'staff' && req.user.role !== 'agency'))
    return res.status(403).json({ message: 'Forbidden' });

  const { userId, slotId, date } = req.body;
  const staffBookingFlag = req.user.role === 'agency' ? true : !!req.body.isStaffBooking;
  if (!userId || !slotId || !date) {
    return res
      .status(400)
      .json({ message: 'Please provide a user, time slot, and date' });
  }

  const slotIdNum = Number(slotId);
  if (Number.isNaN(slotIdNum)) {
    return res.status(400).json({ message: 'Please select a valid time slot' });
  }

  try {
    if (req.user.role === 'agency') {
      const allowed = await isAgencyClient(Number(req.user.id), userId);
      if (!allowed) {
        return res
          .status(403)
          .json({ message: 'Client not linked to your agency' });
      }
    }
    if (!isDateWithinCurrentOrNextMonth(date)) {
      return res.status(400).json({ message: 'Please choose a valid date' });
    }
    const approvedCount = await countApprovedBookingsForMonth(userId, date);
    if (approvedCount >= 2) {
      return res.status(400).json({ message: LIMIT_MESSAGE });
    }

    const upcoming = await findUpcomingBooking(userId);
    if (upcoming) {
      return res
        .status(409)
        .json({ message: 'You already have a booking scheduled', existingBooking: upcoming });
    }

    await checkSlotCapacity(slotIdNum, date);
    const status = staffBookingFlag ? 'approved' : 'submitted';
    const token = randomUUID();

    await insertBooking(
      userId,
      slotIdNum,
      status,
      '',
      date,
      staffBookingFlag,
      token,
    );
    res
      .status(201)
      .json({ message: 'Booking created for user', rescheduleToken: token });
  } catch (error: any) {
    logger.error('Error creating booking for user:', error);
    return next(error);
  }
}

// --- Get booking history (last 6 months) ---
export async function getBookingHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: 'Unauthorized' });

    let userId: number | null = null;
    if (requester.role === 'staff' || requester.role === 'agency') {
      const paramId = req.query.userId as string;
      if (!paramId) {
        return res
          .status(400)
          .json({ message: 'userId query parameter required' });
      }
      userId = Number(paramId);
      if (requester.role === 'agency') {
        const allowed = await isAgencyClient(Number(requester.id), userId);
        if (!allowed) {
          return res
            .status(403)
            .json({ message: 'Client not associated with agency' });
        }
      }
    } else {
      userId = Number((requester as any).userId ?? requester.id);
    }

    if (!userId) return res.status(400).json({ message: 'Invalid user' });

    const status = (req.query.status as string)?.toLowerCase();
    const past = req.query.past === 'true';

    const rows = await repoFetchBookingHistory(userId, past, status);
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching booking history:', error);
    next(error);
  }
}
