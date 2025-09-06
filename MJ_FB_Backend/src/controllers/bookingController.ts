import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/AuthRequest';
import { randomUUID } from 'crypto';
import pool from '../db';
import config from '../config';
import { formatReginaDate } from '../utils/dateUtils';
import {
  isDateWithinCurrentOrNextMonth,
  countVisitsAndBookingsForMonth,
  LIMIT_MESSAGE,
  findUpcomingBooking,
} from '../utils/bookingUtils';
import { enqueueEmail } from '../utils/emailQueue';
import { buildCancelRescheduleLinks, buildCalendarLinks } from '../utils/emailUtils';
import logger from '../utils/logger';
import { parseIdParam } from '../utils/parseIdParam';
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
import { isAgencyClient, getAgencyClientSet } from '../models/agency';
import { refreshClientVisitCount, getClientBookingsThisMonth } from './clientVisitController';

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

  const { slotId, date, isStaffBooking, note, type } = req.body;
  const emailType = type || 'shopping appointment';
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
    const userId = Number(req.user?.userId ?? req.user?.id);
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
    try {
      await client.query('BEGIN');
      await client.query('SELECT client_id FROM clients WHERE client_id=$1 FOR UPDATE', [userId]);
      const monthlyUsage = await countVisitsAndBookingsForMonth(userId, date, client, true);
      if (monthlyUsage === false) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Please choose a valid date' });
      }
      if (monthlyUsage >= 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: LIMIT_MESSAGE });
      }
      const holiday = await client.query('SELECT 1 FROM holidays WHERE date=$1', [date]);
      if ((holiday.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        return res
          .status(400)
          .json({ message: 'Pantry is closed on the selected date.' });
      }
      await checkSlotCapacity(slotIdNum, date, client);
      token = randomUUID();
      await insertBooking(
        userId,
        slotIdNum,
        'approved',
        '',
        date,
        isStaffBooking || false,
        token,
        null,
        note ?? null,
        client,
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof SlotCapacityError) {
        return res.status(err.status).json({ message: err.message });
      }
      throw err;
    } finally {
      client.release();
    }

    if (user.email) {
      const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(token);
      const slotRes = await pool.query(
        'SELECT start_time, end_time FROM slots WHERE id=$1',
        [slotIdNum],
      );
      const { start_time, end_time } = slotRes.rows[0] || {};
      const { googleCalendarLink, outlookCalendarLink } = buildCalendarLinks(
        date,
        start_time,
        end_time,
      );
      const time = start_time && end_time ? ` from ${start_time} to ${end_time}` : '';
      const body = `Date: ${date}${time}`;
      enqueueEmail({
        to: user.email,
        templateId: config.bookingConfirmationTemplateId,
        params: { body, cancelLink, rescheduleLink, googleCalendarLink, outlookCalendarLink, type: emailType },
      });
    } else {
      logger.warn(
        'User %s has no email. Skipping booking status email.',
        userId,
      );
    }
    const bookingsThisMonth = await getClientBookingsThisMonth(userId);
    res.status(201).json({
      message: 'Booking automatically approved',
      bookingsThisMonth,
      status: 'approved',
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
      const uniqueIds = [...new Set(clientIds)];
      const allowed = await getAgencyClientSet(Number(requester.id), uniqueIds);
      if (allowed.size !== uniqueIds.length) {
        return res
          .status(403)
          .json({ message: 'Client not associated with agency' });
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
export async function cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
  const bookingId = req.params.id;
  const requester = req.user;
  if (!requester) return res.status(401).json({ message: 'Unauthorized' });
  const reason =
    requester.role === 'staff' ? (req.body.reason as string) || '' : 'user cancelled';
  const type = (req.body?.type as string) || 'shopping appointment';

  try {
    const booking = await fetchBookingById(Number(bookingId));
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const requesterId = Number(requester.userId ?? requester.id);
    const bookingUserId = booking.user_id ? Number(booking.user_id) : undefined;
    if (requester.role === 'agency') {
      if (bookingUserId !== undefined) {
        const associated = await isAgencyClient(requesterId, bookingUserId);
        if (!associated) {
          return res.status(403).json({
            message: 'Client not associated with agency',
          });
        }
      }
    } else if (requester.role !== 'staff' && bookingUserId !== requesterId) {
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

    await updateBooking(Number(bookingId), {
      status: 'cancelled',
      request_data: reason,
    });

    let email: string | undefined;
    if (bookingUserId !== undefined) {
      const emailRes = await pool.query(
        'SELECT email FROM clients WHERE client_id=$1',
        [bookingUserId],
      );
      email = emailRes.rows[0]?.email;
    } else if (booking.new_client_id) {
      const emailRes = await pool.query(
        'SELECT email FROM new_clients WHERE id=$1',
        [booking.new_client_id],
      );
      email = emailRes.rows[0]?.email;
    }
    if (email) {
      const slotRes = await pool.query(
        'SELECT start_time, end_time FROM slots WHERE id=$1',
        [booking.slot_id],
      );
      const { start_time, end_time } = slotRes.rows[0] || {};
      const time = start_time && end_time ? ` from ${start_time} to ${end_time}` : '';
      const body = `Date: ${booking.date}${time}`;
      enqueueEmail({ to: email, templateId: config.bookingStatusTemplateId, params: { body, type } });
    } else {
      logger.warn(
        'Booking cancellation email not sent. Booking %s has no associated email.',
        bookingId,
      );
    }

    res.json({ message: 'Booking cancelled' });
  } catch (error: any) {
    logger.error('Error cancelling booking:', error);
    next(error);
  }
}

export async function markBookingNoShow(req: Request, res: Response, next: NextFunction) {
  const bookingId = parseIdParam(req.params.id);
  if (bookingId === null) {
    return res.status(400).json({ message: 'Invalid ID' });
  }
  const reason = (req.body?.reason as string) || '';
  const type = (req.body?.type as string) || 'shopping appointment';
  try {
    const result = await pool.query(
      `SELECT COALESCE(c.email, nc.email) AS email, b.reschedule_token, b.date,
              s.start_time, s.end_time
       FROM bookings b
       JOIN slots s ON b.slot_id = s.id
       LEFT JOIN clients c ON b.user_id = c.client_id
       LEFT JOIN new_clients nc ON b.new_client_id = nc.id
       WHERE b.id = $1`,
      [bookingId],
    );

    await updateBooking(bookingId, { status: 'no_show', request_data: reason, note: null });

    const booking = result.rows[0];
    if (booking?.email) {
      const time =
        booking.start_time && booking.end_time
          ? ` from ${booking.start_time} to ${booking.end_time}`
          : '';
      const body = `Date: ${booking.date}${time}`;
      enqueueEmail({ to: booking.email, templateId: config.bookingStatusTemplateId, params: { body, type } });
    }

    res.json({ message: 'Booking marked as no-show' });
  } catch (error) {
    logger.error('Error marking booking no-show:', error);
    next(error);
  }
}

export async function markBookingVisited(req: Request, res: Response, next: NextFunction) {
  const bookingId = parseIdParam(req.params.id);
  if (bookingId === null) {
    return res.status(400).json({ message: 'Invalid ID' });
  }
  const requestData = (req.body?.requestData as string) || '';
  const weightWithCart = req.body?.weightWithCart as number | undefined;
  const weightWithoutCart = req.body?.weightWithoutCart as number | undefined;
  const petItem = req.body?.petItem as number | undefined;
  const note = req.body?.note as string | undefined;
  const adults = req.body?.adults as number | undefined;
  const children = req.body?.children as number | undefined;
  try {
    const dup = await pool.query(
      `SELECT 1 FROM client_visits v
       JOIN bookings b ON v.client_id = b.user_id AND v.date = b.date
       WHERE b.id = $1`,
      [bookingId],
    );
    if ((dup.rowCount ?? 0) > 0) {
      return res.status(409).json({ message: 'Duplicate visit' });
    }
    const insertRes = await pool.query(
      `INSERT INTO client_visits (date, client_id, weight_with_cart, weight_without_cart, pet_item, is_anonymous, note, adults, children)
       SELECT b.date, b.user_id, $1, $2, COALESCE($3,0), false, $4, COALESCE($5,0), COALESCE($6,0)
       FROM bookings b
       WHERE b.id = $7
       RETURNING client_id`,
      [
        weightWithCart ?? null,
        weightWithoutCart ?? null,
        petItem ?? 0,
        note ?? null,
        adults ?? 0,
        children ?? 0,
        bookingId,
      ],
    );
    await updateBooking(bookingId, { status: 'visited', request_data: requestData, note: null });
    const clientId: number | null = insertRes.rows[0]?.client_id ?? null;
    if (clientId) await refreshClientVisitCount(clientId);
    res.json({ message: 'Booking marked as visited' });
  } catch (error) {
    logger.error('Error marking booking visited:', error);
    next(error);
  }
}

// --- Reschedule booking using token ---
export async function rescheduleBooking(req: Request, res: Response, next: NextFunction) {
  const { token } = req.params;
  const { slotId, date, type } = req.body as {
    slotId?: number;
    date?: string;
    type?: string;
  };
  const emailType = type || 'shopping appointment';
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

    const bookingUserId = booking.user_id ? Number(booking.user_id) : undefined;
    const usage =
      bookingUserId !== undefined
        ? await countVisitsAndBookingsForMonth(bookingUserId, date)
        : 0;
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
    if (!isStaffReschedule && adjustedUsage >= 2) {
      return res.status(400).json({ message: LIMIT_MESSAGE });
    }
    const newStatus = isStaffReschedule ? booking.status : 'approved';
    const updateFields: Record<string, any> = {
      slot_id: slotId,
      date,
      reschedule_token: newToken,
      status: newStatus,
    };
    await updateBooking(booking.id, updateFields);

    let email: string | undefined;
    if (bookingUserId !== undefined) {
      const emailRes = await pool.query(
        'SELECT email FROM clients WHERE client_id=$1',
        [bookingUserId],
      );
      email = emailRes.rows[0]?.email;
    } else if (booking.new_client_id) {
      const emailRes = await pool.query(
        'SELECT email FROM new_clients WHERE id=$1',
        [booking.new_client_id],
      );
      email = emailRes.rows[0]?.email;
    }
    if (email) {
      const slotRes = await pool.query(
        'SELECT start_time, end_time FROM slots WHERE id=$1',
        [slotId],
      );
      const { start_time, end_time } = slotRes.rows[0] || {};
      const time = start_time && end_time ? ` from ${start_time} to ${end_time}` : '';
      const body = `Date: ${date}${time}`;
      enqueueEmail({ to: email, templateId: config.bookingStatusTemplateId, params: { body, type: emailType } });
    } else {
      logger.warn(
        'Booking rescheduled email not sent. Booking %s has no associated email.',
        booking.id,
      );
    }

    res.json({
      message: 'Booking rescheduled',
      status: newStatus,
      rescheduleToken: newToken,
    });
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

  const { name, slotId, requestData, date, note } = req.body;
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
      note ?? null,
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

  const { userId, slotId, date, note, type } = req.body;
  const emailType = type || 'shopping appointment';
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
    const holiday = await pool.query('SELECT 1 FROM holidays WHERE date=$1', [date]);
    if ((holiday.rowCount ?? 0) > 0) {
      return res
        .status(400)
        .json({ message: 'Pantry is closed on the selected date.' });
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
      note ?? null,
    );
    const emailRes = await pool.query('SELECT email FROM clients WHERE client_id=$1', [userId]);
    const clientEmail = emailRes.rows[0]?.email;
    const slotRes = await pool.query(
      'SELECT start_time, end_time FROM slots WHERE id=$1',
      [slotIdNum],
    );
    const { start_time, end_time } = slotRes.rows[0] || {};
    if (clientEmail) {
      const { googleCalendarLink, outlookCalendarLink } = buildCalendarLinks(
        date,
        start_time,
        end_time,
      );
      const time = start_time && end_time ? ` from ${start_time} to ${end_time}` : '';
      const body = `Date: ${date}${time}`;
      enqueueEmail({
        to: clientEmail,
        templateId: config.bookingConfirmationTemplateId,
        params: { body, googleCalendarLink, outlookCalendarLink, type: emailType },
      });
    } else {
      logger.warn(
        'Booking approved email not sent. User %s has no email.',
        userId,
      );
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
    const { name, email, phone, slotId, date, note } = req.body;
    if (!name || !slotId || !date) {
      return res
        .status(400)
        .json({ message: 'Please provide name, time slot, and date' });
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
      const holiday = await client.query('SELECT 1 FROM holidays WHERE date=$1', [date]);
      if ((holiday.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        return res
          .status(400)
          .json({ message: 'Pantry is closed on the selected date.' });
      }
      await checkSlotCapacity(Number(slotId), date, client);
      const newClientId = await insertNewClient(name, email || null, phone || null, client);
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
        note ?? null,
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
  req: AuthRequest,
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
      const parsed = Number(requester.userId ?? requester.id);
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
    const includeStaffNotesParam = req.query.includeStaffNotes === 'true';
    const includeStaffNotes =
      requester.role === 'staff' || includeStaffNotesParam;
    const canViewStaffNotes =
      includeStaffNotes &&
      (requester.role === 'staff' || requester.role === 'agency');
    const limitParam = req.query.limit as string | undefined;
    const offsetParam = req.query.offset as string | undefined;
    const limit = limitParam ? Number(limitParam) : undefined;
    const offset = offsetParam ? Number(offsetParam) : undefined;

    if (limitParam !== undefined && Number.isNaN(limit)) {
      return res.status(400).json({ message: 'Invalid limit' });
    }
    if (offsetParam !== undefined && Number.isNaN(offset)) {
      return res.status(400).json({ message: 'Invalid offset' });
    }

    const rows = await repoFetchBookingHistory(
      userIds,
      past,
      status,
      includeVisits,
      limit,
      offset,
    );
    if (!canViewStaffNotes) {
      for (const row of rows as any[]) {
        if ('staff_note' in row) {
          delete (row as any).staff_note;
        }
      }
    }
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching booking history:', error);
    next(error);
  }
}
