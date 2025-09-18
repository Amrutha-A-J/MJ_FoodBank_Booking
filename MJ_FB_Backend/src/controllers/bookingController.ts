import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/AuthRequest';
import { randomUUID } from 'crypto';
import pool from '../db';
import config from '../config';
import {
  formatReginaDate,
  formatReginaDateWithDay,
  formatTimeToAmPm,
  reginaStartOfDayISO,
} from '../utils/dateUtils';
import {
  isDateWithinCurrentOrNextMonth,
  countVisitsAndBookingsForMonth,
  LIMIT_MESSAGE,
  findUpcomingBooking,
} from '../utils/bookingUtils';
import { enqueueEmail } from '../utils/emailQueue';
import {
  buildCancelRescheduleLinks,
  buildCalendarLinks,
  saveIcsFile,
} from '../utils/emailUtils';
import { buildIcsFile } from '../utils/calendarLinks';
import logger from '../utils/logger';
import { isHoliday } from '../utils/holidayCache';
import { parseIdParam } from '../utils/parseIdParam';
import {
  SlotCapacityError,
  checkSlotCapacity,
  insertBooking,
  lockClientRow,
  fetchBookings as repoFetchBookings,
  fetchBookingById,
  updateBooking,
  fetchBookingByToken,
  fetchBookingHistory as repoFetchBookingHistory,
  insertWalkinUser,
} from '../models/bookingRepository';
import { insertNewClient } from '../models/newClient';
import { refreshClientVisitCount, getClientBookingsThisMonth } from './clientVisitController';
import { hasTable } from '../utils/dbUtils';
import { getCartTare } from '../utils/configCache';
import { notifyOps } from '../utils/opsAlert';

const NO_SHOW_MESSAGE =
  'This booking has already expired and was marked as a no-show. Please book a new appointment.';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateString(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function isTodayOrFutureDate(date: string): boolean {
  if (!isValidDateString(date)) return false;
  try {
    const today = new Date(reginaStartOfDayISO(new Date()));
    const bookingDate = new Date(reginaStartOfDayISO(date));
    return bookingDate >= today;
  } catch {
    return false;
  }
}

// --- Create booking for logged-in shopper ---
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { slotId, date, isStaffBooking, note, type } = req.body;
  const emailType = type || 'Shopping Appointment';
  if (slotId === undefined || slotId === null) {
    return res
      .status(400)
      .json({ message: 'Please select a valid time slot' });
  }

  const slotIdNum = Number(slotId);
  if (!Number.isInteger(slotIdNum)) {
    return res
      .status(400)
      .json({ message: 'Please select a valid time slot' });
  }

  if (!date) {
    return res.status(400).json({ message: 'Please select a date' });
  }

  if (!isValidDateString(date)) {
    return res.status(400).json({ message: 'Please choose a valid date' });
  }

  try {
    const userId = Number(req.user?.userId ?? req.user?.id);

    const client = await pool.connect();
    let token: string;
    let bookingId: number;
    let transactionActive = false;
    try {
      await client.query('BEGIN');
      transactionActive = true;
      try {
        logger.info('Locking client row', { userId, slotId: slotIdNum, date });
        await lockClientRow(userId, client);
      } catch (err) {
        if ((err as any)?.code !== '25P02') {
          logger.error(
            `Failed to lock client row for user ${userId}, slot ${slotIdNum} on ${date}`,
            err,
          );
        }
        throw err;
      }
      let upcoming;
      try {
        logger.info('Checking upcoming booking', { userId });
        upcoming = await findUpcomingBooking(userId, client);
      } catch (err) {
        if ((err as any)?.code !== '25P02') {
          logger.error(`Failed to check upcoming booking for user ${userId}`, err);
        }
        throw err;
      }
      if (upcoming) {
        await client.query('ROLLBACK');
        transactionActive = false;
        return res
          .status(409)
          .json({
            message: 'You already have a booking scheduled',
            existingBooking: upcoming,
          });
      }
      let monthlyUsage: number | false;
      try {
        logger.info('Counting visits and bookings for month', {
          userId,
          slotId: slotIdNum,
          date,
        });
        monthlyUsage = await countVisitsAndBookingsForMonth(
          userId,
          date,
          client,
          true,
        );
      } catch (err) {
        if ((err as any)?.code !== '25P02') {
          logger.error(
            `Failed to count visits and bookings for user ${userId} on ${date} (slot ${slotIdNum})`,
            err,
          );
        }
        throw err;
      }
      if (monthlyUsage === false) {
        await client.query('ROLLBACK');
        transactionActive = false;
        return res.status(400).json({ message: 'Please choose a valid date' });
      }
      if (monthlyUsage >= 2) {
        await client.query('ROLLBACK');
        transactionActive = false;
        return res.status(400).json({ message: LIMIT_MESSAGE });
      }
      let holiday: boolean;
      try {
        logger.info('Checking holiday', { userId, slotId: slotIdNum, date });
        holiday = await isHoliday(date, client);
      } catch (err) {
        if ((err as any)?.code !== '25P02') {
          logger.error(
            `Failed to check holiday for ${date} (user ${userId}, slot ${slotIdNum})`,
            err,
          );
        }
        throw err;
      }
      if (holiday) {
        await client.query('ROLLBACK');
        transactionActive = false;
        return res
          .status(400)
          .json({ message: 'Pantry is closed on the selected date.' });
      }
      try {
        logger.info('Checking slot capacity', { userId, slotId: slotIdNum, date });
        await checkSlotCapacity(slotIdNum, date, client);
      } catch (err) {
        if ((err as any)?.code !== '25P02') {
          logger.error(
            `Failed to check slot capacity for user ${userId}, slot ${slotIdNum} on ${date}`,
            err,
          );
        }
        throw err;
      }
      token = randomUUID();
      try {
        logger.info('Inserting booking', { userId, slotId: slotIdNum, date });
        bookingId = await insertBooking(
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
      } catch (err) {
        if ((err as any)?.code !== '25P02') {
          logger.error(
            `Failed to insert booking for user ${userId}, slot ${slotIdNum} on ${date}`,
            err,
          );
        }
        throw err;
      }
      await client.query('COMMIT');
      transactionActive = false;
    } catch (err: any) {
      if (transactionActive) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr: any) {
          if (rollbackErr?.code !== '25P02') {
            logger.error('Failed to rollback transaction', rollbackErr);
          }
        }
      }
      if (err instanceof SlotCapacityError || err?.code === '25P02') {
        if (err?.code === '25P02') {
          return res
            .status(503)
            .json({ message: 'Transaction aborted, please retry' });
        }
        return res.status(err.status).json({ message: err.message });
      }
      throw err;
    } finally {
      client.release();
    }

    const slotRes = await pool.query(
      'SELECT start_time, end_time FROM slots WHERE id=$1',
      [slotIdNum],
    );
    const uid = `booking-${bookingId}@mjfb`;
    const { start_time, end_time } = slotRes.rows[0] || {};
    if (start_time) {
      try {
        await notifyOps(
          `${user.name || 'Client'} (client) booked ${formatReginaDateWithDay(date)} at ${formatTimeToAmPm(start_time)}`,
        );
      } catch (err) {
        logger.error('Failed to notify ops', err);
      }
    }
    const {
      googleCalendarLink,
      appleCalendarLink,
      icsContent,
    } = buildCalendarLinks(date, start_time, end_time, uid, 0);

    const time =
      start_time && end_time
        ? ` from ${formatTimeToAmPm(start_time)} to ${formatTimeToAmPm(end_time)}`
        : '';
    const formattedDate = formatReginaDateWithDay(date);
    const body = `Date: ${formattedDate}${time}`;
    if (user.email) {
      const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(token);
      const attachments = [
        {
          name: 'booking.ics',
          content: Buffer.from(icsContent, 'utf8').toString('base64'),
          type: 'text/calendar',
        },
      ];
      enqueueEmail({
        to: user.email,
        templateId: config.bookingConfirmationTemplateId,
        params: {
          body,
          cancelLink,
          rescheduleLink,
          googleCalendarLink,
          appleCalendarLink,
          type: emailType,
        },
        attachments,
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
      googleCalendarUrl: googleCalendarLink,
      icsUrl: appleCalendarLink,
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
  const type = (req.body?.type as string) || 'Shopping Appointment';

  try {
    const booking = await fetchBookingById(Number(bookingId));
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const requesterId = Number(requester.userId ?? requester.id);
    const bookingUserId = booking.user_id ? Number(booking.user_id) : undefined;
    if (requester.role !== 'staff' && bookingUserId !== requesterId) {
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
    let name = 'Client';
    if (bookingUserId !== undefined) {
      const emailRes = await pool.query(
        'SELECT email, first_name, last_name FROM clients WHERE client_id=$1',
        [bookingUserId],
      );
      const row = emailRes.rows[0];
      email = row?.email;
      if (row?.first_name && row?.last_name) {
        name = `${row.first_name} ${row.last_name}`;
      }
    } else {
      const newClientId = (booking as any).new_client_id;
      if (newClientId) {
        const hasNewClients = await hasTable('new_clients');
        if (hasNewClients) {
          const emailRes = await pool.query(
            'SELECT email, name FROM new_clients WHERE id=$1',
            [newClientId],
          );
          const row = emailRes.rows[0];
          email = row?.email;
          name = row?.name || name;
        }
      }
    }
    let start_time: string | undefined;
    if (booking.slot_id) {
      const slotRes = await pool.query('SELECT start_time FROM slots WHERE id=$1', [
        booking.slot_id,
      ]);
      start_time = slotRes.rows[0]?.start_time;
    }
    if (start_time) {
      try {
        await notifyOps(
          `${name} (client) cancelled booking for ${formatReginaDateWithDay(booking.date)} at ${formatTimeToAmPm(start_time)}`,
        );
      } catch (err) {
        logger.error('Failed to notify ops', err);
      }
    }
    res.json({ message: 'Booking cancelled' });
  } catch (error: any) {
    logger.error('Error cancelling booking:', error);
    next(error);
  }
}

// --- Cancel booking using reschedule token ---
export async function cancelBookingByToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { token } = req.params;
  try {
    const booking = await fetchBookingByToken(token);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.status !== 'approved') {
      return res
        .status(400)
        .json({ message: "This booking can't be cancelled" });
    }
    const todayStr = formatReginaDate(new Date());
    if (booking.date < todayStr) {
      return res
        .status(400)
        .json({ message: "You can't cancel past bookings" });
    }
    await updateBooking(booking.id, {
      status: 'cancelled',
      request_data: 'user cancelled',
    });
    let name = 'Client';
    let start_time: string | undefined;
    if (booking.slot_id) {
      const slotRes = await pool.query('SELECT start_time FROM slots WHERE id=$1', [
        booking.slot_id,
      ]);
      start_time = slotRes.rows[0]?.start_time;
    }
    if (booking.user_id) {
      const resUser = await pool.query(
        'SELECT first_name, last_name FROM clients WHERE client_id=$1',
        [booking.user_id],
      );
      const row = resUser.rows[0];
      if (row?.first_name && row?.last_name) {
        name = `${row.first_name} ${row.last_name}`;
      }
    } else if ((booking as any).new_client_id) {
      const resNc = await pool.query('SELECT name FROM new_clients WHERE id=$1', [
        (booking as any).new_client_id,
      ]);
      name = resNc.rows[0]?.name || name;
    }
    if (start_time) {
      try {
        await notifyOps(
          `${name} (client) cancelled booking for ${formatReginaDateWithDay(booking.date)} at ${formatTimeToAmPm(start_time)}`,
        );
      } catch (err) {
        logger.error('Failed to notify ops', err);
      }
    }
    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    logger.error('Error cancelling booking by token:', error);
    next(error);
  }
}

export async function markBookingNoShow(req: Request, res: Response, next: NextFunction) {
  const bookingId = parseIdParam(req.params.id);
  if (bookingId === null) {
    return res.status(400).json({ message: 'Invalid ID' });
  }
  const reason = (req.body?.reason as string) || '';
  try {
    await updateBooking(bookingId, { status: 'no_show', request_data: reason, note: null });

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
  const fields: [string, number | undefined | null][] = [
    ['weightWithCart', weightWithCart],
    ['weightWithoutCart', weightWithoutCart],
    ['petItem', petItem],
    ['adults', adults],
    ['children', children],
  ];
  for (const [name, value] of fields) {
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return res.status(400).json({ message: `${name} must be a non-negative number` });
      }
    }
  }
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
    const cartTare = await getCartTare();
    let weightWithCartVal = weightWithCart ?? null;
    let weightWithoutCartVal = weightWithoutCart ?? null;
    if (weightWithCartVal == null && weightWithoutCartVal != null) {
      weightWithCartVal = weightWithoutCartVal + cartTare;
    }
    if (weightWithoutCartVal == null && weightWithCartVal != null) {
      weightWithoutCartVal = weightWithCartVal - cartTare;
    }
    if (weightWithoutCartVal != null && weightWithoutCartVal < 0) {
      weightWithoutCartVal = 0;
    }
    const insertRes = await pool.query(
      `INSERT INTO client_visits (date, client_id, weight_with_cart, weight_without_cart, pet_item, is_anonymous, note, adults, children)
       SELECT b.date, b.user_id, $1, $2, COALESCE($3,0), false, $4, COALESCE($5,0), COALESCE($6,0)
       FROM bookings b
       WHERE b.id = $7
       RETURNING client_id`,
      [
        weightWithCartVal ?? null,
        weightWithoutCartVal ?? null,
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
  const emailType = type || 'Shopping Appointment';
  if (!slotId || !date) {
    return res.status(400).json({ message: 'Please select a time slot and date' });
  }
  if (!isValidDateString(date)) {
    return res.status(400).json({ message: 'Please choose a valid date' });
  }
  try {
    const client = await pool.connect();
    let booking: any;
    let oldSlotRes: any;
    let newSlotRes: any;
    let emailRes: any;
    let newToken = '';
    let newStatus = '';
    try {
      await client.query('BEGIN');
      booking = await fetchBookingByToken(token, client, true);
      if (!booking) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Booking not found' });
      }
      if (booking.status === 'no_show') {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: NO_SHOW_MESSAGE });
      }
      if (booking.status !== 'approved') {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: "This booking can't be rescheduled" });
      }
      if (req.user?.role !== 'staff' && !isDateWithinCurrentOrNextMonth(date)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Please choose a valid date' });
      }
      await checkSlotCapacity(slotId, date, client);

      const bookingUserId = booking.user_id ? Number(booking.user_id) : undefined;
      const usage =
        bookingUserId !== undefined
          ? await countVisitsAndBookingsForMonth(bookingUserId, date)
          : 0;
      if (usage === false) {
        await client.query('ROLLBACK');
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

      newToken = randomUUID();
      const isStaffReschedule = req.user && req.user.role === 'staff';
      if (!isStaffReschedule && adjustedUsage >= 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: LIMIT_MESSAGE });
      }
      newStatus = isStaffReschedule ? booking.status : 'approved';
      const updateFields: Record<string, any> = {
        slot_id: slotId,
        date,
        reschedule_token: newToken,
        status: newStatus,
      };

      oldSlotRes = await client.query(
        'SELECT start_time, end_time FROM slots WHERE id=$1',
        [booking.slot_id],
      );
      newSlotRes = await client.query(
        'SELECT start_time, end_time FROM slots WHERE id=$1',
        [slotId],
      );
      const hasNewClients = await hasTable('new_clients', client);
      emailRes = hasNewClients
        ? await client.query(
            `SELECT COALESCE(u.email, nc.email) AS email,
                    COALESCE(u.first_name || ' ' || u.last_name, nc.name) AS name
             FROM bookings b
             LEFT JOIN clients u ON b.user_id = u.client_id
             LEFT JOIN new_clients nc ON b.new_client_id = nc.id
             WHERE b.id=$1`,
            [booking.id],
          )
        : await client.query(
            `SELECT u.email AS email, u.first_name, u.last_name
             FROM bookings b
             LEFT JOIN clients u ON b.user_id = u.client_id
             WHERE b.id=$1`,
            [booking.id],
          );

      await updateBooking(booking.id, updateFields, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { email, name: nameRes, first_name, last_name } = emailRes.rows[0] || {};
    const name =
      nameRes || (first_name && last_name ? `${first_name} ${last_name}` : 'Client');
    if (email) {
      const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(newToken);
      const oldTime = oldSlotRes.rows[0]
        ? `${formatTimeToAmPm(oldSlotRes.rows[0].start_time)} to ${formatTimeToAmPm(oldSlotRes.rows[0].end_time)}`
        : '';
      const newTime = newSlotRes.rows[0]
        ? `${formatTimeToAmPm(newSlotRes.rows[0].start_time)} to ${formatTimeToAmPm(newSlotRes.rows[0].end_time)}`
        : '';
      const uid = `booking-${booking.id}@mjfb`;
      const {
        googleCalendarLink,
        appleCalendarLink,
        icsContent,
      } = buildCalendarLinks(
        date,
        newSlotRes.rows[0]?.start_time,
        newSlotRes.rows[0]?.end_time,
        uid,
        1,
      );
      const cancelIcs = buildIcsFile({
        title: 'Harvest Pantry Booking',
        start: `${booking.date}T${oldSlotRes.rows[0].start_time}-06:00`,
        end: `${booking.date}T${oldSlotRes.rows[0].end_time}-06:00`,
        description: 'Your booking at the Harvest Pantry',
        location: 'Moose Jaw Food Bank',
        uid,
        method: 'CANCEL',
        sequence: 1,
      });
      const cancelBase64 = Buffer.from(cancelIcs, 'utf8').toString('base64');
      const cancelFileName = `${uid}-cancel.ics`;
      const appleCalendarCancelLink = saveIcsFile(cancelFileName, cancelIcs);
      const attachments = [
        {
          name: 'booking.ics',
          content: Buffer.from(icsContent, 'utf8').toString('base64'),
          type: 'text/calendar',
        },
        {
          name: 'booking-cancel.ics',
          content: cancelBase64,
          type: 'text/calendar',
        },
      ];
      enqueueEmail({
        to: email,
        templateId:
          config.clientRescheduleTemplateId || config.bookingConfirmationTemplateId,
        params: {
          oldDate: formatReginaDateWithDay(booking.date),
          oldTime,
          newDate: formatReginaDateWithDay(date),
          newTime,
          cancelLink,
          rescheduleLink,
          googleCalendarLink,
          appleCalendarLink,
          appleCalendarCancelLink,
          type: emailType,
        },
        attachments,
      });
    } else {
      logger.warn('Booking %s has no email. Skipping reschedule email.', booking.id);
    }

    const oldStart = oldSlotRes.rows[0]?.start_time;
    const newStart = newSlotRes.rows[0]?.start_time;
    try {
      await notifyOps(
        `${name} (client) rescheduled booking from ${formatReginaDateWithDay(booking.date)} ${
          oldStart ? formatTimeToAmPm(oldStart) : ''
        } to ${formatReginaDateWithDay(date)} ${
          newStart ? formatTimeToAmPm(newStart) : ''
        }`,
      );
    } catch (err) {
      logger.error('Failed to notify ops', err);
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

export async function getRescheduleBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { token } = req.params;
  try {
    const booking = await fetchBookingByToken(token);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.status === 'no_show') {
      return res.status(400).json({ message: NO_SHOW_MESSAGE });
    }
    if (booking.status !== 'approved') {
      return res
        .status(400)
        .json({ message: "This booking can't be rescheduled" });
    }
    res.json({ message: 'Booking can be rescheduled' });
  } catch (error) {
    logger.error('Error validating reschedule booking:', error);
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
    const slotRes = await pool.query('SELECT start_time FROM slots WHERE id=$1', [
      slotId,
    ]);
    const start_time = slotRes.rows[0]?.start_time;
    if (start_time) {
      try {
        await notifyOps(
          `${name} (client) booked ${formatReginaDateWithDay(date)} at ${formatTimeToAmPm(start_time)}`,
        );
      } catch (err) {
        logger.error('Failed to notify ops', err);
      }
    }
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
  if (!req.user || req.user.role !== 'staff')
    return res.status(403).json({ message: 'Forbidden' });

  const { userId, slotId, date, note, type } = req.body;
  const emailType = type || 'Shopping Appointment';
  const staffBookingFlag = !!req.body.isStaffBooking;
  if (slotId === undefined || slotId === null) {
    return res
      .status(400)
      .json({ message: 'Please select a valid time slot' });
  }
  if (!userId || !date) {
    return res
      .status(400)
      .json({ message: 'Please provide a user, time slot, and date' });
  }
  const slotIdNum = Number(slotId);
  if (!Number.isInteger(slotIdNum)) {
    return res
      .status(400)
      .json({ message: 'Please select a valid time slot' });
  }
  if (!isTodayOrFutureDate(date)) {
    return res.status(400).json({ message: 'Invalid date' });
  }

  try {

    const client = await pool.connect();
    const status = 'approved';
    let token: string;
    let bookingId: number;
    try {
      await client.query('BEGIN');
      await lockClientRow(userId, client);
      const upcoming = await findUpcomingBooking(userId, client);
      if (upcoming) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'You already have a booking scheduled',
          existingBooking: upcoming,
        });
      }
      const usage = await countVisitsAndBookingsForMonth(userId, date, client, true);
      if (usage === false) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Please choose a valid date' });
      }
      if (usage >= 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: LIMIT_MESSAGE });
      }
      const holiday = await isHoliday(date, client);
      if (holiday) {
        await client.query('ROLLBACK');
        return res
          .status(400)
          .json({ message: 'Pantry is closed on the selected date.' });
      }
      const reginaDate = formatReginaDate(date);
      const slotLock = await client.query(
        'SELECT max_capacity FROM slots WHERE id=$1 FOR UPDATE',
        [slotIdNum],
      );
      if (slotLock.rowCount === 0) {
        await client.query('ROLLBACK');
        return res
          .status(400)
          .json({ message: 'Please select a valid time slot' });
      }
      const capacity = slotLock.rows[0].max_capacity;
      const existing = await client.query(
        `SELECT COUNT(id) AS count FROM bookings
         WHERE slot_id=$1 AND date=$2 AND status='approved'`,
        [slotIdNum, reginaDate],
      );
      if (Number(existing.rows[0].count) >= capacity) {
        await client.query('ROLLBACK');
        return res
          .status(409)
          .json({ message: 'Slot full on selected date' });
      }
      token = randomUUID();
      bookingId = await insertBooking(
        userId,
        slotIdNum,
        status,
        '',
        date,
        staffBookingFlag,
        token,
        null,
        note ?? null,
        client,
      );
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err instanceof SlotCapacityError || err?.code === '25P02') {
        if (err?.code === '25P02') {
          return res
            .status(503)
            .json({ message: 'Transaction aborted, please retry' });
        }
        return res.status(err.status).json({ message: err.message });
      }
      throw err;
    } finally {
      client.release();
    }

    const uid = `booking-${bookingId}@mjfb`;
    const emailRes = await pool.query(
      'SELECT email, first_name, last_name FROM clients WHERE client_id=$1',
      [userId],
    );
    const { email: clientEmail, first_name, last_name } = emailRes.rows[0] || {};
    const slotRes = await pool.query(
      'SELECT start_time, end_time FROM slots WHERE id=$1',
      [slotIdNum],
    );
    const { start_time, end_time } = slotRes.rows[0] || {};
    if (start_time) {
      const name = first_name && last_name ? `${first_name} ${last_name}` : 'Client';
      try {
        await notifyOps(
          `${name} (client) booked ${formatReginaDateWithDay(date)} at ${formatTimeToAmPm(start_time)}`,
        );
      } catch (err) {
        logger.error('Failed to notify ops', err);
      }
    }
    if (clientEmail) {
        const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(token);
        const {
          googleCalendarLink,
          appleCalendarLink,
          icsContent,
        } = buildCalendarLinks(date, start_time, end_time, uid, 0);
        const time =
          start_time && end_time
            ? ` from ${formatTimeToAmPm(start_time)} to ${formatTimeToAmPm(end_time)}`
            : '';
        const formattedDate = formatReginaDateWithDay(date);
        const body = `Date: ${formattedDate}${time}`;
        const attachments = [
          {
            name: 'booking.ics',
            content: Buffer.from(icsContent, 'utf8').toString('base64'),
            type: 'text/calendar',
          },
        ];
      enqueueEmail({
        to: clientEmail,
        templateId: config.bookingConfirmationTemplateId,
        params: {
          body,
          cancelLink,
          rescheduleLink,
          googleCalendarLink,
          appleCalendarLink,
          type: emailType,
        },
        attachments,
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

    if (req.user?.role !== 'staff' && !isDateWithinCurrentOrNextMonth(date)) {
      return res.status(400).json({ message: 'Please choose a valid date' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const holiday = await isHoliday(date, client);
      if (holiday) {
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
      const slotRes = await pool.query('SELECT start_time FROM slots WHERE id=$1', [
        Number(slotId),
      ]);
      const start_time = slotRes.rows[0]?.start_time;
      if (start_time) {
        try {
          await notifyOps(
            `${name} (client) booked ${formatReginaDateWithDay(date)} at ${formatTimeToAmPm(start_time)}`,
          );
        } catch (err) {
          logger.error('Failed to notify ops', err);
        }
      }
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
    const canViewStaffNotes = requester.role === 'staff';
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
