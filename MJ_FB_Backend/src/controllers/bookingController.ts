import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db';
import { formatReginaDate } from '../utils/dateUtils';
import {
  isDateWithinCurrentOrNextMonth,
  countVisitsAndBookingsForMonth,
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

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateString(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

// --- Create booking for logged-in shopper ---
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { slotId, date, isStaffBooking } = req.body;
  if (slotId === undefined || slotId === null) {
    return res.status(400).json({ message: 'Please select a time slot' });
  }

  if (!isValidDateString(date)) {
    return res.status(400).json({ message: 'Please choose a valid date' });
  }

  const slotIdNum = Number(slotId);
  if (!Number.isInteger(slotIdNum)) {
    return res.status(400).json({ message: 'Please select a valid time slot' });
  }

  if (!date) {
    return res.status(400).json({ message: 'Please select a date' });
  }

  try {
    const userId = Number((req.user as any).userId ?? req.user?.id);
    if (!isDateWithinCurrentOrNextMonth(date)) {
      return res.status(400).json({ message: 'Please choose a valid date' });
    }

    const upcoming = await findUpcomingBooking(userId);
    if (upcoming) {
      return res
        .status(409)
        .json({ message: 'You already have a booking scheduled', existingBooking: upcoming });
    }

    const client = await pool.connect();
    let token: string | undefined;
    let status = 'rejected';
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM clients WHERE id=$1 FOR UPDATE', [userId]);
      const monthlyUsage = await countVisitsAndBookingsForMonth(userId, date, client, true);
      if (monthlyUsage === false) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ message: 'Please choose a valid date' });
      }
      status = monthlyUsage < 2 ? 'approved' : 'rejected';
      if (status === 'approved') {
        await checkSlotCapacity(slotIdNum, date, client);
      }
      token = randomUUID();
      await insertBooking(
        userId,
        slotIdNum,
        status,
        status === 'rejected' ? LIMIT_MESSAGE : '',
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

    if (status === 'approved') {
      enqueueEmail(
        user.email || 'test@example.com',
        'Booking approved',
        `Your booking for ${date} has been automatically approved`,
      );
    } else {
      enqueueEmail(
        user.email || 'test@example.com',
        'Booking rejected',
        `Your booking for ${date} was automatically rejected. ${LIMIT_MESSAGE}`,
      );
    }
    const countRes = await pool.query('SELECT bookings_this_month FROM clients WHERE id=$1', [userId]);
    const bookingsThisMonth = countRes.rows[0]?.bookings_this_month ?? 0;
    res
      .status(201)
      .json({
        message: status === 'approved' ? 'Booking automatically approved' : LIMIT_MESSAGE,
        bookingsThisMonth,
        status,
        rescheduleToken: token,
      });
  } catch (error: any) {
    logger.error('Error creating booking:', error);
    return next(error);
  }
}

// --- List all bookings (for staff) ---
export async function listBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const status = (req.query.status as string)?.toLowerCase();
    const date = req.query.date as string | undefined;
    const clientIdsParam = req.query.clientIds as string | undefined;
    const clientIds = clientIdsParam
      ? clientIdsParam
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((n) => !Number.isNaN(n))
      : undefined;
    const rows = await repoFetchBookings(status, date, clientIds);
    res.json(rows);
  } catch (error) {
    logger.error('Error listing bookings:', error);
    next(error);
  }
}

// --- Approve or reject booking ---
export async function decideBooking(req: Request, res: Response, next: NextFunction) {
  const bookingId = req.params.id;

  try {
    const booking = await fetchBookingById(Number(bookingId));
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'submitted') {
      return res.status(400).json({ message: 'Booking already processed' });
    }

    if (!isDateWithinCurrentOrNextMonth(booking.date)) {
      return res
        .status(400)
        .json({ message: 'Booking date must be within this month or next' });
    }

    const usage = await countVisitsAndBookingsForMonth(booking.user_id, booking.date);
    if (usage === false) {
      return res.status(400).json({ message: 'Please choose a valid date' });
    }
    const decision = usage < 2 ? 'approved' : 'rejected';
    const reason = decision === 'rejected' ? LIMIT_MESSAGE : '';

    if (decision === 'approved') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await checkSlotCapacity(booking.slot_id, booking.date, client);
        await updateBooking(
          Number(bookingId),
          {
            status: 'approved',
            request_data: '',
          },
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
    } else {
      await updateBooking(Number(bookingId), {
        status: 'rejected',
        request_data: reason,
      });
    }

    enqueueEmail(
      'test@example.com',
      `Booking ${decision}`,
      `Booking ${bookingId} has been automatically ${decision}`,
    );

    res.json({ message: `Booking ${decision}` });
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

export async function markBookingNoShow(req: Request, res: Response, next: NextFunction) {
  const bookingId = Number(req.params.id);
  const reason = (req.body?.reason as string) || '';
  try {
    await updateBooking(bookingId, { status: 'no_show', request_data: reason });
    res.json({ message: 'Booking marked as no-show' });
  } catch (error) {
    logger.error('Error marking booking no-show:', error);
    next(error);
  }
}

export async function markBookingVisited(req: Request, res: Response, next: NextFunction) {
  const bookingId = Number(req.params.id);
  const requestData = (req.body?.requestData as string) || '';
  try {
    await updateBooking(bookingId, { status: 'visited', request_data: requestData });
    res.json({ message: 'Booking marked as visited' });
  } catch (error) {
    logger.error('Error marking booking visited:', error);
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
  if (!isValidDateString(date)) {
    return res.status(400).json({ message: 'Please choose a valid date' });
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

    const usage = await countVisitsAndBookingsForMonth(booking.user_id, date);
    if (usage === false) {
      return res.status(400).json({ message: 'Please choose a valid date' });
    }
    let adjustedUsage = usage;
    if (
      booking.status === 'approved' &&
      booking.date &&
      formatReginaDate(booking.date).slice(0, 7) === date.slice(0, 7)
    ) {
      adjustedUsage -= 1;
    }

    const newToken = randomUUID();
    const isStaffReschedule = req.user && req.user.role === 'staff';
    const newStatus = isStaffReschedule
      ? booking.status
      : adjustedUsage < 2
        ? 'approved'
        : 'submitted';
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

  if (!isValidDateString(date)) {
    return res.status(400).json({ message: 'Please choose a valid date' });
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

    const usage = await countVisitsAndBookingsForMonth(newUserId, date);
    if (usage === false) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Please choose a valid date' });
    }
    if (usage >= 2) {
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

  if (!isValidDateString(date)) {
    return res.status(400).json({ message: 'Please choose a valid date' });
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
    const usage = await countVisitsAndBookingsForMonth(userId, date);
    if (usage === false) {
      return res.status(400).json({ message: 'Please choose a valid date' });
    }
    if (usage >= 2) {
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
