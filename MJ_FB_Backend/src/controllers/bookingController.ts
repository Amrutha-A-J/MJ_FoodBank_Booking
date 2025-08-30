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
import { insertNewClient } from '../models/newClient';
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
      await client.query('SELECT client_id FROM clients WHERE client_id=$1 FOR UPDATE', [userId]);
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
        null,
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
      if (user.email) {
        enqueueEmail(
          user.email,
          'Booking approved',
          `Your booking for ${date} has been automatically approved`,
        );
      } else {
        logger.warn(`Booking approval email not sent: user ${user.id} has no email`);
      }
    } else {
      if (user.email) {
        enqueueEmail(
          user.email,
          'Booking rejected',
          `Your booking for ${date} was automatically rejected. ${LIMIT_MESSAGE}`,
        );
      } else {
        logger.warn(`Booking rejection email not sent: user ${user.id} has no email`);
      }
    }
    const countRes = await pool.query('SELECT bookings_this_month FROM clients WHERE client_id=$1', [userId]);
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
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: 'Unauthorized' });

    const status = (req.query.status as string)?.toLowerCase();
    const date = req.query.date as string | undefined;
    const clientIdsParam = req.query.clientIds as string | undefined;
    const clientIds = clientIdsParam
      ? clientIdsParam
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((n) => !Number.isNaN(n))
      : undefined;

    if (requester.role === 'agency') {
      if (!clientIds || clientIds.length === 0) {
        return res
          .status(400)
          .json({ message: 'clientIds query parameter required' });
      }
      for (const id of clientIds) {
        const allowed = await isAgencyClient(Number(requester.id), id);
        if (!allowed) {
          return res
            .status(403)
            .json({ message: 'Client not associated with agency' });
        }
      }
    }

    const rows = await repoFetchBookings(status, date, clientIds);
    res.json(rows);
  } catch (error) {
    logger.error('Error listing bookings:', error);
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
    if (requester.role === 'agency') {
      const associated = await isAgencyClient(requesterId, booking.user_id);
      if (!associated) {
        return res.status(403).json({
          message: 'Client not associated with agency',
        });
      }
    } else if (requester.role !== 'staff' && booking.user_id !== requesterId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (booking.status !== 'approved') {
      return res
        .status(400)
        .json({ message: 'Only approved bookings can be cancelled' });
    }

    const todayStr = formatReginaDate(new Date());
    if (booking.date < todayStr) {
      return res.status(400).json({ message: "You can't cancel past bookings" });
    }

    await updateBooking(Number(bookingId), { status: 'cancelled', request_data: reason });

    const emailRes = await pool.query('SELECT email FROM clients WHERE client_id=$1', [booking.user_id]);
    const clientEmail = emailRes.rows[0]?.email;
    if (clientEmail) {
      enqueueEmail(
        clientEmail,
        'Booking cancelled',
        `Booking ${bookingId} was cancelled`,
      );
    } else {
      logger.warn(
        `Booking cancellation email not sent: user ${booking.user_id} has no email`,
      );
    }

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
    if (booking.status !== 'approved') {
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
        : 'rejected';
    const updateFields: Record<string, any> = {
      slot_id: slotId,
      date,
      reschedule_token: newToken,
      status: newStatus,
    };
    if (newStatus === 'rejected') {
      updateFields.request_data = LIMIT_MESSAGE;
    }
    await updateBooking(booking.id, updateFields);

    const emailRes = await pool.query('SELECT email FROM clients WHERE client_id=$1', [booking.user_id]);
    const clientEmail = emailRes.rows[0]?.email;
    if (clientEmail) {
      enqueueEmail(
        clientEmail,
        'Booking rescheduled',
        `Booking ${booking.id} was rescheduled`,
      );
    } else {
      logger.warn(
        `Booking reschedule email not sent: user ${booking.user_id} has no email`,
      );
    }

    res.json({ message: 'Booking rescheduled', status: newStatus, rescheduleToken: newToken });
  } catch (error: any) {
    logger.error('Error rescheduling booking:', error);
    next(error);
  }
}

// --- Staff: create walk-in booking for walk-in user ---
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
      null,
      client,
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Walk-in booking created', rescheduleToken: token });
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Error creating walk-in booking:', error);
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
    const status = 'approved';
    const token = randomUUID();

    await insertBooking(
      userId,
      slotIdNum,
      status,
      '',
      date,
      staffBookingFlag,
      token,
      null,
    );
    const emailRes = await pool.query('SELECT email FROM clients WHERE client_id=$1', [userId]);
    const clientEmail = emailRes.rows[0]?.email;
    if (clientEmail) {
      enqueueEmail(
        clientEmail,
        'Booking approved',
        `Your booking for ${date} has been automatically approved`,
      );
    } else {
      logger.warn(`Booking approval email not sent: user ${userId} has no email`);
    }
    res
      .status(201)
      .json({ message: 'Booking created for user', status, rescheduleToken: token });
  } catch (error: any) {
    logger.error('Error creating booking for user:', error);
    return next(error);
  }
}

// --- Create booking for new client ---
export async function createBookingForNewClient(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, email, phone, slotId, date } = req.body;
    if (!name || !email || !slotId || !date) {
      return res
        .status(400)
        .json({ message: 'Please provide name, email, time slot, and date' });
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
      await checkSlotCapacity(Number(slotId), date, client);
      const newClientId = await insertNewClient(name, email, phone || null, client);
      const token = randomUUID();
      await insertBooking(
        null,
        Number(slotId),
        'approved',
        '',
        date,
        false,
        token,
        newClientId,
        client,
      );
      await client.query('COMMIT');
      res
        .status(201)
        .json({ message: 'Booking created for new client', rescheduleToken: token });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error creating booking for new client:', error);
    next(error);
  }
}

// --- Get booking history ---
export async function getBookingHistory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: 'Unauthorized' });

    let userIds: number[] = [];
    if (requester.role === 'staff') {
      const paramId = req.query.userId as string;
      if (!paramId) {
        return res
          .status(400)
          .json({ message: 'userId query parameter required' });
      }
      const parsed = Number(paramId);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: 'Invalid user' });
      }
      userIds = [parsed];
    } else if (requester.role === 'agency') {
      const clientIdsParam = req.query.clientIds as string | undefined;
      if (clientIdsParam) {
        userIds = clientIdsParam
          .split(',')
          .map(id => Number(id.trim()))
          .filter(n => !Number.isNaN(n));
        if (userIds.length === 0) {
          return res.status(400).json({ message: 'Invalid clientIds' });
        }
        const checks = await Promise.all(
          userIds.map(id => isAgencyClient(Number(requester.id), id)),
        );
        if (checks.some(allowed => !allowed)) {
          return res
            .status(403)
            .json({ message: 'Client not associated with agency' });
        }
      } else {
        const paramId = req.query.userId as string;
        if (!paramId) {
          return res
            .status(400)
            .json({ message: 'userId query parameter required' });
        }
        const parsed = Number(paramId);
        if (Number.isNaN(parsed)) {
          return res.status(400).json({ message: 'Invalid user' });
        }
        const allowed = await isAgencyClient(Number(requester.id), parsed);
        if (!allowed) {
          return res
            .status(403)
            .json({ message: 'Client not associated with agency' });
        }
        userIds = [parsed];
      }
    } else {
      const parsed = Number((requester as any).userId ?? requester.id);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ message: 'Invalid user' });
      }
      userIds = [parsed];
    }

    if (userIds.length === 0) {
      return res.status(400).json({ message: 'Invalid user' });
    }

    const status = (req.query.status as string)?.toLowerCase();
    const past = req.query.past === 'true';
    const includeVisits = req.query.includeVisits === 'true';
    const limitParam = req.query.limit as string | undefined;
    const offsetParam = req.query.offset as string | undefined;
    const limit = limitParam ? Number(limitParam) : undefined;
    const offset = offsetParam ? Number(offsetParam) : undefined;

    const rows = await repoFetchBookingHistory(
      userIds,
      past,
      status,
      includeVisits,
      limit,
      offset,
    );
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching booking history:', error);
    next(error);
  }
}
