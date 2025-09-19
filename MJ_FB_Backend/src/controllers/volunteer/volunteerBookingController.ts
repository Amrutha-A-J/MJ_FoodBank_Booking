import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
import pool from '../../db';
import {
  sendTemplatedEmail,
  buildCancelRescheduleLinks,
  buildCalendarLinks,
  saveIcsFile,
} from '../../utils/emailUtils';
import { buildIcsFile } from '../../utils/calendarLinks';
import { enqueueEmail } from '../../utils/emailQueue';
import logger from '../../utils/logger';
import {
  CreateRecurringVolunteerBookingRequest,
  CreateRecurringVolunteerBookingForVolunteerRequest,
} from '../../types/volunteerBooking';
import {
  formatReginaDate,
  formatReginaDateWithDay,
  reginaStartOfDayISO,
  formatTimeToAmPm,
  isValidDateString,
} from '../../utils/dateUtils';
import config from '../../config';
import { notifyOps } from '../../utils/opsAlert';
import { volunteerBookingsByDateSchema } from '../../schemas/volunteer/volunteerBookingSchemas';
import { isHoliday, getHolidays } from '../../utils/holidayCache';

const STATUS_COLORS: Record<string, string> = {
  approved: 'green',
  cancelled: 'gray',
  no_show: 'red',
  completed: 'green',
};

function statusColor(status: string) {
  return STATUS_COLORS[status] || null;
}

function mapBookingRow(b: any) {
  return {
    ...b,
    date: b.date instanceof Date ? formatReginaDate(b.date) : b.date,
    status_color: statusColor(b.status),
  };
}


export async function createVolunteerBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  const { roleId, date, type, note } = req.body as {
    roleId?: number;
    date?: string;
    type?: string;
    note?: string;
  };
  const emailType = type || 'Volunteer Shift';
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!roleId || !date) {
    return res.status(400).json({ message: 'roleId and date are required' });
  }
  if (!isValidDateString(date)) {
    return res.status(400).json({ message: 'Please choose a valid date' });
  }
  const today = formatReginaDate(new Date());
  if (date < today) {
    return res.status(400).json({ message: 'Please choose a valid date' });
  }

  try {
    const slotRes = await pool.query(
      `SELECT vs.role_id, vs.max_volunteers, vs.start_time, vs.end_time,
              vmr.name AS category_name, vr.name AS role_name
       FROM volunteer_slots vs
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       WHERE vs.slot_id = $1 AND vs.is_active`,
      [roleId]
    );
    if ((slotRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const slot = slotRes.rows[0];

    if (date === today) {
      const nowTime = new Date().toLocaleTimeString('en-CA', {
        timeZone: 'America/Regina',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      if (slot.start_time <= nowTime) {
        return res.status(400).json({ message: 'Shift has already started' });
      }
    }

    const volRes = await pool.query(
      'SELECT 1 FROM volunteer_trained_roles WHERE volunteer_id = $1 AND role_id = $2',
      [user.id, slot.role_id]
    );
    if ((volRes.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: 'Not trained for this role' });
    }

    const isWeekend = [0, 6].includes(
      new Date(reginaStartOfDayISO(date!)).getUTCDay(),
    );
    const isHolidayDate = await isHoliday(date!);
    const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
    if ((isWeekend || isHolidayDate) && restrictedCategories.includes(slot.category_name)) {
      return res.status(400).json({ message: 'Role not bookable on holidays or weekends' });
    }

    const existingRes = await pool.query(
      `SELECT id, status FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3`,
      [roleId, date!, user.id]
    );
    let existingCancelledId: number | undefined;
    if ((existingRes.rowCount ?? 0) > 0) {
      const existing = existingRes.rows[0];
      if (existing.status === 'cancelled') {
        existingCancelledId = existing.id;
      } else {
        return res.status(400).json({ message: 'Already booked for this shift' });
      }
    }

    const sameDayRes = await pool.query(
      `SELECT vb.id, vb.slot_id AS role_id, vb.date, vs.start_time, vs.end_time, vr.name AS role_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       WHERE vb.volunteer_id = $1 AND vb.date = $2 AND vb.status='approved'`,
      [user.id, date]
    );
    if ((sameDayRes.rowCount ?? 0) > 0) {
      const existing = sameDayRes.rows[0];
      return res.status(409).json({
        message: 'Already booked for this date',
        attempted: {
          role_id: roleId,
          role_name: slot.role_name,
          date,
          start_time: slot.start_time,
          end_time: slot.end_time,
        },
        existing: {
          id: existing.id,
          role_id: existing.role_id,
          role_name: existing.role_name,
          date:
            existing.date instanceof Date
              ? formatReginaDate(existing.date)
              : existing.date,
          start_time: existing.start_time,
          end_time: existing.end_time,
        },
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const lockRes = await client.query(
        'SELECT max_volunteers FROM volunteer_slots WHERE slot_id = $1 FOR UPDATE',
        [roleId],
      );
      const maxVolunteers = Number(lockRes.rows[0].max_volunteers);

      const countRes = await client.query(
        `SELECT COUNT(*) FROM volunteer_bookings
         WHERE slot_id = $1 AND date = $2 AND status='approved'`,
        [roleId, date],
      );
      if (Number(countRes.rows[0].count) >= maxVolunteers) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Role is full' });
      }

      const token = randomUUID();
      const insertRes = existingCancelledId
        ? await client.query(
            `UPDATE volunteer_bookings
             SET status='approved', reschedule_token=$1, note=$2, reason=NULL
             WHERE id=$3
             RETURNING id, slot_id, volunteer_id, date, status, reschedule_token, recurring_id, note`,
            [token, note ?? null, existingCancelledId],
          )
        : await client.query(
            `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, status, reschedule_token, note)
             VALUES ($1, $2, $3, 'approved', $4, $5)
             RETURNING id, slot_id, volunteer_id, date, status, reschedule_token, recurring_id, note`,
            [roleId, user.id, date, token, note ?? null],
          );

      await client.query('COMMIT');

      let googleCalendarLink: string | undefined;
      let appleCalendarLink: string | undefined;
      if (user.email) {
        const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(
          token,
        );
        const uid = `volunteer-booking-${insertRes.rows[0].id}@mjfb`;
        const links = buildCalendarLinks(
          date,
          slot.start_time,
          slot.end_time,
          uid,
          0,
        );
        googleCalendarLink = links.googleCalendarLink;
        appleCalendarLink = links.appleCalendarLink;
        const body = `Date: ${formatReginaDateWithDay(date)} from ${formatTimeToAmPm(
          slot.start_time,
        )} to ${formatTimeToAmPm(slot.end_time)}`;
        const attachments = [
          {
            name: 'shift.ics',
            content: Buffer.from(links.icsContent, 'utf8').toString('base64'),
            type: 'text/calendar',
          },
        ];
        enqueueEmail({
          to: user.email,
          templateId: config.volunteerBookingConfirmationTemplateId,
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
          'Volunteer booking confirmation email not sent. Volunteer %s has no email.',
          user.id,
        );
      }

      const booking = insertRes.rows[0];
      booking.role_id = booking.slot_id;
      delete booking.slot_id;
      booking.status_color = statusColor(booking.status);
      booking.date =
        booking.date instanceof Date
          ? formatReginaDate(booking.date)
          : booking.date;
      await notifyOps(
        `${user.name || 'Volunteer'} (volunteer) booked ${formatReginaDateWithDay(date)} at ${formatTimeToAmPm(slot.start_time)}`,
      );
      res.status(201).json({
        message: 'Booking automatically approved',
        status: 'approved',
        rescheduleToken: token,
        googleCalendarUrl: googleCalendarLink,
        icsUrl: appleCalendarLink,
      });
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Already booked for this shift' });
      }
      logger.error('Error creating volunteer booking:', error);
      next(error);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error creating volunteer booking:', error);
    next(error);
  }
}

export async function createVolunteerBookingForVolunteer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { volunteerId, roleId, date, force } = req.body as {
    volunteerId?: number;
    roleId?: number;
    date?: string;
    force?: boolean;
  };
  if (!volunteerId || !roleId || !date) {
    return res
      .status(400)
      .json({ message: 'volunteerId, roleId and date are required' });
  }
  let bookingDate: Date;
  try {
    bookingDate = new Date(reginaStartOfDayISO(date));
  } catch {
    return res.status(400).json({ message: 'Invalid date' });
  }
  if (isNaN(bookingDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date' });
  }
  const today = new Date(reginaStartOfDayISO(new Date()));
  if (bookingDate < today) {
    return res.status(400).json({ message: 'Date cannot be in the past' });
  }

  try {
    const slotRes = await pool.query(
      `SELECT vs.role_id, vs.max_volunteers, vs.start_time, vs.end_time,
              vmr.name AS category_name, vr.name AS role_name
       FROM volunteer_slots vs
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       WHERE vs.slot_id = $1 AND vs.is_active`,
      [roleId]
    );
    if ((slotRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const slot = slotRes.rows[0];

    const trainedRes = await pool.query(
      'SELECT 1 FROM volunteer_trained_roles WHERE volunteer_id = $1 AND role_id = $2',
      [volunteerId, slot.role_id]
    );
    if ((trainedRes.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: 'Volunteer not trained for this role' });
    }
    const isWeekend = [0, 6].includes(bookingDate.getUTCDay());
    const isHolidayDate = await isHoliday(date);
    const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
    if ((isWeekend || isHolidayDate) && restrictedCategories.includes(slot.category_name)) {
      return res
        .status(400)
        .json({ message: 'Role not bookable on holidays or weekends' });
    }

    const existingRes = await pool.query(
      `SELECT id, status FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3`,
      [roleId, date, volunteerId]
    );
    let existingCancelledId: number | undefined;
    if ((existingRes.rowCount ?? 0) > 0) {
      const existing = existingRes.rows[0];
      if (existing.status === 'cancelled') {
        existingCancelledId = existing.id;
      } else {
        return res.status(400).json({ message: 'Already booked for this shift' });
      }
    }

      const sameDayRes = await pool.query(
        `SELECT vb.id, vb.slot_id AS role_id, vb.date, vs.start_time, vs.end_time, vr.name AS role_name
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         JOIN volunteer_roles vr ON vs.role_id = vr.id
         WHERE vb.volunteer_id=$1 AND vb.date=$2 AND vb.status='approved'`,
        [volunteerId, date]
      );
      if ((sameDayRes.rowCount ?? 0) > 0) {
        const existing = sameDayRes.rows[0];
        return res.status(409).json({
          message: 'Volunteer already has a booking on this date',
          attempted: {
            role_id: roleId,
            role_name: slot.role_name,
            date,
            start_time: slot.start_time,
            end_time: slot.end_time,
          },
          existing: {
            id: existing.id,
            role_id: existing.role_id,
            role_name: existing.role_name,
            date:
              existing.date instanceof Date
                ? formatReginaDate(existing.date)
                : existing.date,
            start_time: existing.start_time,
            end_time: existing.end_time,
          },
        });
      }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const lockRes = await client.query(
        'SELECT max_volunteers FROM volunteer_slots WHERE slot_id = $1 FOR UPDATE',
        [roleId],
      );
      let maxVolunteers = Number(lockRes.rows[0].max_volunteers);

      const countRes = await client.query(
        `SELECT COUNT(*) FROM volunteer_bookings
         WHERE slot_id = $1 AND date = $2 AND status='approved'`,
        [roleId, date],
      );
      if (Number(countRes.rows[0].count) >= maxVolunteers) {
        if (force) {
          await client.query(
            'UPDATE volunteer_slots SET max_volunteers = max_volunteers + 1 WHERE slot_id = $1',
            [roleId],
          );
          maxVolunteers += 1;
        } else {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Role is full' });
        }
      }

        const token = randomUUID();
        const insertRes = existingCancelledId
          ? await client.query(
              `UPDATE volunteer_bookings
               SET status='approved', reschedule_token=$1, reason=NULL
               WHERE id=$2
               RETURNING id, slot_id, volunteer_id, date, status, reschedule_token, recurring_id`,
              [token, existingCancelledId],
            )
          : await client.query(
              `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, status, reschedule_token)
               VALUES ($1, $2, $3, 'approved', $4)
               RETURNING id, slot_id, volunteer_id, date, status, reschedule_token, recurring_id`,
              [roleId, volunteerId, date, token],
            );

      await client.query('COMMIT');

      const booking = insertRes.rows[0];
      let name = 'Volunteer';
      try {
        const nameRes = await pool.query(
          'SELECT first_name, last_name FROM volunteers WHERE id=$1',
          [volunteerId],
        );
        const row = nameRes.rows[0];
        if (row?.first_name && row?.last_name) {
          name = `${row.first_name} ${row.last_name}`;
        }
      } catch (e) {
        logger.warn('Volunteer name lookup failed for %s', volunteerId);
      }
      await notifyOps(
        `${name} (volunteer) booked ${formatReginaDateWithDay(date)} at ${formatTimeToAmPm(slot.start_time)}`,
      );
      const uid = `volunteer-booking-${booking.id}@mjfb`;
      const links = buildCalendarLinks(
        date,
        slot.start_time,
        slot.end_time,
        uid,
        0,
      );
      res.status(201).json({
        message: 'Booking automatically approved',
        status: 'approved',
        rescheduleToken: token,
        googleCalendarUrl: links.googleCalendarLink,
        icsUrl: links.appleCalendarLink,
      });
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Already booked for this shift' });
      }
      logger.error('Error creating volunteer booking for volunteer:', error);
      next(error);
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Error creating volunteer booking for volunteer:', error);
    next(error);
  }
}

export async function resolveVolunteerBookingConflict(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  const existingBookingId = Number((req.body as any).existingBookingId);
  const rawRoleId = (req.body as any).roleId;
  const roleId =
    rawRoleId !== undefined && rawRoleId !== null
      ? Number(rawRoleId)
      : undefined;
  const { date, keep, type } = req.body as {
    date?: string;
    keep?: 'existing' | 'new';
    type?: string;
  };
  const emailType = type || 'Volunteer Shift';

  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (
    !existingBookingId ||
    !keep ||
    (keep === 'new' && (!roleId || !date))
  ) {
    return res.status(400).json({
      message:
        'existingBookingId and keep are required; roleId and date are required when keep is new',
    });
  }

  try {
    const existingRes = await pool.query(
      `SELECT vb.id, vb.slot_id AS role_id, vb.date, vs.start_time, vs.end_time, vr.name AS role_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       WHERE vb.id = $1 AND vb.volunteer_id = $2`,
      [existingBookingId, user.id]
    );
    if ((existingRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Existing booking not found' });
    }
    const existing = existingRes.rows[0];
    const existingBooking = {
      id: existing.id,
      role_id: existing.role_id,
      role_name: existing.role_name,
      date:
        existing.date instanceof Date
          ? formatReginaDate(existing.date)
          : existing.date,
      start_time: existing.start_time,
      end_time: existing.end_time,
    };

    if (keep === 'existing') {
      return res.json({ kept: 'existing', booking: existingBooking });
    }

    const slotRes = await pool.query(
      `SELECT vs.role_id, vs.max_volunteers, vs.start_time, vs.end_time,
              vmr.name AS category_name, vr.name AS role_name
       FROM volunteer_slots vs
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       WHERE vs.slot_id = $1 AND vs.is_active`,
      [roleId]
    );
    if ((slotRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const slot = slotRes.rows[0];

    const volRes = await pool.query(
      'SELECT 1 FROM volunteer_trained_roles WHERE volunteer_id = $1 AND role_id = $2',
      [user.id, slot.role_id]
    );
    if ((volRes.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: 'Not trained for this role' });
    }

    const isWeekend = [0, 6].includes(
      new Date(reginaStartOfDayISO(date!)).getUTCDay(),
    );
    const isHolidayDate = await isHoliday(date!);
    const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
    if ((isWeekend || isHolidayDate) && restrictedCategories.includes(slot.category_name)) {
      return res
        .status(400)
        .json({ message: 'Role not bookable on holidays or weekends' });
    }

    const existingShiftRes = await pool.query(
      `SELECT 1 FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3 AND status='approved'`,
      [roleId, date!, user.id]
    );
    if ((existingShiftRes.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Already booked for this shift' });
    }

      const sameDayRes = await pool.query(
        `SELECT vb.id, vb.slot_id AS role_id, vb.date, vs.start_time, vs.end_time, vr.name AS role_name
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         JOIN volunteer_roles vr ON vs.role_id = vr.id
         WHERE vb.volunteer_id = $1 AND vb.date = $2 AND vb.status='approved' AND vb.id <> $3`,
        [user.id, date!, existingBookingId]
      );
      if ((sameDayRes.rowCount ?? 0) > 0) {
        const conflict = sameDayRes.rows[0];
        return res.status(409).json({
          message: 'Already booked for this date',
          attempted: {
            role_id: roleId,
            role_name: slot.role_name,
            date,
            start_time: slot.start_time,
            end_time: slot.end_time,
          },
          existing: {
            id: conflict.id,
            role_id: conflict.role_id,
            role_name: conflict.role_name,
            date:
              conflict.date instanceof Date
                ? formatReginaDate(conflict.date)
                : conflict.date,
            start_time: conflict.start_time,
            end_time: conflict.end_time,
          },
        });
      }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND status='approved'`,
      [roleId, date!]
    );
    if (Number(countRes.rows[0].count) >= slot.max_volunteers) {
      return res.status(400).json({ message: 'Role is full' });
    }

    await pool.query(
      'UPDATE volunteer_bookings SET status=$1, reason=$2 WHERE id=$3',
      ['cancelled', 'conflict', existingBookingId],
    );

    const token = randomUUID();
    const insertRes = await pool.query(
      `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, status, reschedule_token)
       VALUES ($1, $2, $3, 'approved', $4)
       RETURNING id, slot_id, volunteer_id, date, status, reschedule_token, recurring_id`,
      [roleId, user.id, date!, token]
    );

    if (user.email) {
      const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(token);
      const uid = `volunteer-booking-${insertRes.rows[0].id}@mjfb`;
      const {
        googleCalendarLink,
        appleCalendarLink,
        icsContent,
      } = buildCalendarLinks(date!, slot.start_time, slot.end_time, uid, 0);
      const body = `Date: ${formatReginaDateWithDay(date!)} from ${formatTimeToAmPm(
        slot.start_time,
      )} to ${formatTimeToAmPm(slot.end_time)}`;
      const attachments = [
        {
          name: 'shift.ics',
          content: Buffer.from(icsContent, 'utf8').toString('base64'),
          type: 'text/calendar',
        },
      ];
      enqueueEmail({
        to: user.email,
        templateId: config.volunteerBookingConfirmationTemplateId,
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
        'Volunteer booking confirmation email not sent. Volunteer %s has no email.',
        user.id,
      );
    }

    const booking = insertRes.rows[0];
    booking.role_id = booking.slot_id;
    delete booking.slot_id;
    booking.status_color = statusColor(booking.status);
    booking.date =
      booking.date instanceof Date
        ? formatReginaDate(booking.date)
        : booking.date;

    return res.status(201).json({ kept: 'new', booking });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Already booked for this shift' });
    }
    logger.error('Error resolving volunteer booking conflict:', error);
    next(error);
  }
}

export async function listUnmarkedVolunteerBookings(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query(
      `SELECT vb.id, vb.status, vb.slot_id AS role_id, vb.volunteer_id, vb.date,
              vb.reschedule_token, vb.recurring_id,
              vs.start_time, vs.end_time, vs.max_volunteers, vr.name AS role_name, vmr.name AS category_name,
              v.first_name || ' ' || v.last_name AS volunteer_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       JOIN volunteers v ON vb.volunteer_id = v.id
       WHERE vb.status='approved' AND vb.date < CURRENT_DATE
       ORDER BY vb.date, vs.start_time`
    );
    const bookings = result.rows.map(mapBookingRow);
    res.json(bookings);
  } catch (error) {
    logger.error('Error listing unmarked volunteer bookings:', error);
    next(error);
  }
}

export async function listVolunteerBookings(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { roleIds } = req.query as { roleIds?: string };
    let result;
    if (roleIds) {
      const ids = roleIds
        .split(',')
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id));
      if (ids.length === 0) {
        return res.json([]);
      }
      result = await pool.query(
        `SELECT vb.id, vb.status, vb.slot_id AS role_id, vb.volunteer_id, vb.date,
                vb.reschedule_token, vb.recurring_id,
                vs.start_time, vs.end_time, vs.max_volunteers, vr.name AS role_name, vmr.name AS category_name,
                v.first_name || ' ' || v.last_name AS volunteer_name
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         JOIN volunteer_roles vr ON vs.role_id = vr.id
         JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
         JOIN volunteers v ON vb.volunteer_id = v.id
         WHERE vb.slot_id = ANY($1::int[])
         ORDER BY vb.date, vs.start_time`,
        [ids],
      );
    } else {
      result = await pool.query(
        `SELECT vb.id, vb.status, vb.slot_id AS role_id, vb.volunteer_id, vb.date,
                vb.reschedule_token, vb.recurring_id,
                vs.start_time, vs.end_time, vs.max_volunteers, vr.name AS role_name, vmr.name AS category_name,
                v.first_name || ' ' || v.last_name AS volunteer_name
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         JOIN volunteer_roles vr ON vs.role_id = vr.id
         JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
         JOIN volunteers v ON vb.volunteer_id = v.id
         ORDER BY vb.date, vs.start_time`,
      );
    }
    const bookings = result.rows.map(mapBookingRow);
    res.json(bookings);
  } catch (error) {
    logger.error('Error listing volunteer bookings:', error);
    next(error);
  }
}

export async function listVolunteerBookingsByDate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { date } = volunteerBookingsByDateSchema.parse(req.query);
    const result = await pool.query(
      `SELECT vb.id, vb.status, vb.slot_id AS role_id, vb.volunteer_id, vb.date,
              vb.reschedule_token, vb.recurring_id,
              vs.start_time, vs.end_time, vs.max_volunteers, vr.name AS role_name, vmr.name AS category_name,
              v.first_name || ' ' || v.last_name AS volunteer_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       JOIN volunteers v ON vb.volunteer_id = v.id
       WHERE vb.date = $1
       ORDER BY vs.start_time`,
      [date],
    );
    const bookings = result.rows.map(mapBookingRow);
    res.json(bookings);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    logger.error('Error listing volunteer bookings by date:', error);
    next(error);
  }
}

export async function listVolunteerBookingsByRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { role_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT vb.id, vb.status, vb.slot_id AS role_id, vb.volunteer_id, vb.date,
              vb.reschedule_token, vb.recurring_id,
              vs.start_time, vs.end_time, vs.max_volunteers, vr.name AS role_name, vmr.name AS category_name,
              v.first_name || ' ' || v.last_name AS volunteer_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       JOIN volunteers v ON vb.volunteer_id = v.id
       WHERE vb.slot_id = $1
       ORDER BY vb.date, vs.start_time`,
      [role_id]
    );
    const bookings = result.rows.map(mapBookingRow);
    res.json(bookings);
  } catch (error) {
    logger.error('Error listing volunteer bookings:', error);
    next(error);
  }
}

export async function listMyVolunteerBookings(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await pool.query(
      `SELECT vb.id, vb.status, vb.slot_id AS role_id, vb.volunteer_id, vb.date,
              vb.reschedule_token, vb.recurring_id,
              vs.start_time, vs.end_time, vr.name AS role_name, vmr.name AS category_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       WHERE vb.volunteer_id = $1
       ORDER BY vb.date DESC, vs.start_time DESC`,
      [user.id]
    );
    const bookings = result.rows.map(mapBookingRow);
    res.json(bookings);
  } catch (error) {
    logger.error('Error listing volunteer bookings for volunteer:', error);
    next(error);
  }
}

export async function listVolunteerBookingsByVolunteer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { volunteer_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT vb.id, vb.status, vb.slot_id AS role_id, vb.volunteer_id, vb.date,
              vb.reschedule_token, vb.recurring_id,
              vs.start_time, vs.end_time, vs.max_volunteers, vr.name AS role_name, vmr.name AS category_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       WHERE vb.volunteer_id = $1
       ORDER BY vb.date DESC, vs.start_time DESC`,
      [volunteer_id]
    );
    const bookings = result.rows.map(mapBookingRow);
    res.json(bookings);
  } catch (error) {
    logger.error('Error listing volunteer bookings for volunteer:', error);
    next(error);
  }
}

export async function updateVolunteerBookingStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const { status, reason } = req.body as { status?: string; reason?: string };
  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }
  if (status === 'visited') {
    return res
      .status(400)
      .json({ message: 'Use completed instead of visited for volunteer shifts' });
  }
  if (!['cancelled', 'no_show', 'completed'].includes(status)) {
    return res
      .status(400)
      .json({ message: 'Status must be cancelled, no_show or completed' });
  }

  try {
    const bookingRes = await pool.query(
      'SELECT id, volunteer_id, slot_id, date, status FROM volunteer_bookings WHERE id=$1',
      [id],
    );
    if ((bookingRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookingRes.rows[0];

    if (status === 'cancelled') {
      if (!reason) {
        return res.status(400).json({ message: 'Reason is required when cancelling' });
      }
      const bookingDate = new Date(reginaStartOfDayISO(booking.date));
      const today = new Date(reginaStartOfDayISO(new Date()));
      if (booking.status === 'cancelled') {
        return res.status(400).json({ message: 'Booking already cancelled' });
      }
      if (bookingDate < today) {
        return res.status(400).json({ message: 'Booking already occurred' });
      }
    }

    const updateRes = await pool.query(
      `UPDATE volunteer_bookings SET status=$1, reason=$3 WHERE id=$2
       RETURNING id, slot_id, volunteer_id, date, status, recurring_id, reason`,
      [status, id, status === 'cancelled' ? reason : null]
    );
    const updated = updateRes.rows[0];
    updated.role_id = updated.slot_id;
    delete updated.slot_id;
    updated.status_color = statusColor(updated.status);
    updated.date =
      updated.date instanceof Date
        ? formatReginaDate(updated.date)
        : updated.date;
    res.json(updated);
  } catch (error) {
    logger.error('Error updating volunteer booking:', error);
    next(error);
  }
}

export async function rescheduleVolunteerBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { token } = req.params;
  const { roleId, date } = req.body as { roleId?: number; date?: string };
  if (!roleId || !date) {
    return res.status(400).json({ message: 'roleId and date are required' });
  }
  try {
    const bookingRes = await pool.query(
      'SELECT id, volunteer_id, slot_id, date, status FROM volunteer_bookings WHERE reschedule_token = $1',
      [token],
    );
    if ((bookingRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookingRes.rows[0];

    const slotRes = await pool.query(
      `SELECT role_id, max_volunteers, start_time, end_time
       FROM volunteer_slots
       WHERE slot_id = $1 AND is_active`,
      [roleId],
    );
    if ((slotRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const slot = slotRes.rows[0];

    const trainedRes = await pool.query(
      'SELECT 1 FROM volunteer_trained_roles WHERE volunteer_id = $1 AND role_id = $2',
      [booking.volunteer_id, slot.role_id],
    );
    if ((trainedRes.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: 'Volunteer not trained for this role' });
    }

    const existingRes = await pool.query(
      `SELECT 1 FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3 AND status='approved' AND id <> $4`,
      [roleId, date, booking.volunteer_id, booking.id]
    );
    if ((existingRes.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Already booked for this shift' });
    }

    const overlapRes = await pool.query(
      `SELECT vb.id, vs.start_time, vs.end_time
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       WHERE vb.volunteer_id=$1 AND vb.date=$2 AND vb.status='approved' AND vb.id <> $5
         AND NOT (vs.end_time <= $3 OR vs.start_time >= $4)`,
      [
        booking.volunteer_id,
        date,
        slot.start_time,
        slot.end_time,
        booking.id,
      ],
    );
    if ((overlapRes.rowCount ?? 0) > 0) {
      return res.status(409).json({
        message: 'Booking overlaps an existing shift',
        overlap: overlapRes.rows.map((r: any) => ({
          id: r.id,
          start_time: r.start_time,
          end_time: r.end_time,
        })),
      });
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND status='approved'`,
      [roleId, date],
    );
    if (Number(countRes.rows[0].count) >= slot.max_volunteers) {
      return res.status(400).json({ message: 'Role is full' });
    }

    const oldSlotRes = await pool.query(
      'SELECT start_time, end_time FROM volunteer_slots WHERE slot_id = $1',
      [booking.slot_id],
    );
    const emailRes = await pool.query(
      'SELECT email, first_name, last_name FROM volunteers WHERE id = $1',
      [booking.volunteer_id],
    );

    const newToken = randomUUID();
    await pool.query(
      "UPDATE volunteer_bookings SET slot_id=$1, date=$2, reschedule_token=$3, status='approved', reason=NULL WHERE id=$4",
      [roleId, date, newToken, booking.id],
    );

    const { email, first_name, last_name } = emailRes.rows[0] || {};
    const name = first_name && last_name ? `${first_name} ${last_name}` : 'Volunteer';
    if (email) {
        const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(newToken);
        const oldTime = oldSlotRes.rows[0]
          ? `${formatTimeToAmPm(oldSlotRes.rows[0].start_time)} to ${formatTimeToAmPm(
              oldSlotRes.rows[0].end_time,
            )}`
          : '';
      const uid = `volunteer-booking-${booking.id}@mjfb`;
      const {
        googleCalendarLink,
        appleCalendarLink,
        icsContent,
      } = buildCalendarLinks(date, slot.start_time, slot.end_time, uid, 1);
      const cancelIcs = buildIcsFile({
        title: 'Volunteer Shift',
        start: `${booking.date}T${oldSlotRes.rows[0].start_time}-06:00`,
        end: `${booking.date}T${oldSlotRes.rows[0].end_time}-06:00`,
        description: 'Your volunteer shift at the Harvest Pantry',
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
          name: 'shift.ics',
          content: Buffer.from(icsContent, 'utf8').toString('base64'),
          type: 'text/calendar',
        },
        {
          name: 'shift-cancel.ics',
          content: cancelBase64,
          type: 'text/calendar',
        },
      ];
      enqueueEmail({
        to: email,
        templateId:
          config.volunteerRescheduleTemplateId ||
          config.volunteerBookingConfirmationTemplateId,
        params: {
          oldDate: formatReginaDateWithDay(booking.date),
          oldTime,
          newDate: formatReginaDateWithDay(date),
            newTime: `${formatTimeToAmPm(slot.start_time)} to ${formatTimeToAmPm(
              slot.end_time,
            )}`,
          cancelLink,
          rescheduleLink,
          googleCalendarLink,
          appleCalendarLink,
          appleCalendarCancelLink,
          type: 'Volunteer Shift',
        },
        attachments,
      });
    } else {
      logger.warn(
        'Volunteer booking %s has no email. Skipping reschedule email.',
        booking.id,
      );
    }

      await notifyOps(
        `${name} (volunteer) rescheduled shift from ${formatReginaDateWithDay(booking.date)} ${formatTimeToAmPm(
          oldSlotRes.rows[0].start_time,
        )} to ${formatReginaDateWithDay(date)} ${formatTimeToAmPm(slot.start_time)}`,
      );

    res.json({
      message: 'Booking rescheduled',
      status: 'approved',
      rescheduleToken: newToken,
    });
  } catch (error) {
    logger.error('Error rescheduling volunteer booking:', error);
    next(error);
  }
}

export async function getRescheduleVolunteerBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { token } = req.params;
  try {
    const result = await pool.query(
      'SELECT status FROM volunteer_bookings WHERE reschedule_token = $1',
      [token],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const status = result.rows[0].status;
    if (status !== 'approved') {
      return res
        .status(400)
        .json({ message: "This booking can't be rescheduled" });
    }
    return res.json({ message: 'Booking can be rescheduled' });
  } catch (error) {
    logger.error('Error validating volunteer reschedule booking:', error);
    next(error);
  }
}

export async function createRecurringVolunteerBooking(
  req: Request<{}, {}, CreateRecurringVolunteerBookingRequest>,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  const { roleId, startDate, endDate, pattern, daysOfWeek = [] } = req.body;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!roleId || !startDate || !endDate || !pattern) {
    return res
      .status(400)
      .json({ message: 'roleId, startDate, endDate and pattern are required' });
  }
  try {
    const slotRes = await pool.query(
      `SELECT vs.role_id, vs.max_volunteers, vs.start_time, vs.end_time, vmr.name AS category_name
       FROM volunteer_slots vs
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       WHERE vs.slot_id = $1 AND vs.is_active`,
      [roleId],
    );
    if ((slotRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const slot = slotRes.rows[0];

    const trainedRes = await pool.query(
      'SELECT 1 FROM volunteer_trained_roles WHERE volunteer_id = $1 AND role_id = $2',
      [user.id, slot.role_id],
    );
    if ((trainedRes.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: 'Not trained for this role' });
    }

    const recurringRes = await pool.query(
      `INSERT INTO volunteer_recurring_bookings (volunteer_id, slot_id, start_date, end_date, pattern, days_of_week, active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       RETURNING id`,
      [user.id, roleId, startDate, endDate, pattern, daysOfWeek],
    );
    const recurringId = recurringRes.rows[0].id;
    const dates: string[] = [];
    const start = new Date(reginaStartOfDayISO(startDate));
    const end = new Date(reginaStartOfDayISO(endDate));
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      if (
        pattern === 'daily' ||
        (pattern === 'weekly' && daysOfWeek.includes(d.getUTCDay()))
      ) {
        dates.push(formatReginaDate(d));
      }
    }

    const [holidays, capacityRes, existingRes, overlapRes] = await Promise.all([
      getHolidays(),
      pool.query(
        `SELECT date, COUNT(*)
         FROM volunteer_bookings
         WHERE slot_id=$1 AND date BETWEEN $2 AND $3 AND status='approved'
         GROUP BY date`,
        [roleId, startDate, endDate],
      ),
      pool.query(
        `SELECT date FROM volunteer_bookings
         WHERE slot_id=$1 AND volunteer_id=$2 AND date BETWEEN $3 AND $4 AND status='approved'`,
        [roleId, user.id, startDate, endDate],
      ),
      pool.query(
        `SELECT vb.date
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         WHERE vb.volunteer_id=$1 AND vb.date BETWEEN $2 AND $3 AND vb.status='approved'
           AND NOT (vs.end_time <= $4 OR vs.start_time >= $5)`,
        [user.id, startDate, endDate, slot.start_time, slot.end_time],
      ),
    ]);

    const holidaySet = new Set(
      holidays
        .filter(h => h.date >= startDate && h.date <= endDate)
        .map(h => h.date),
    );
    const capacityMap = new Map<string, number>();
    for (const row of capacityRes.rows) {
      const key = row.date instanceof Date ? formatReginaDate(row.date) : row.date;
      capacityMap.set(key, Number(row.count));
    }
    const existingSet = new Set(
      existingRes.rows.map((r: any) =>
        r.date instanceof Date ? formatReginaDate(r.date) : r.date,
      ),
    );
    const overlapSet = new Set(
      overlapRes.rows.map((r: any) =>
        r.date instanceof Date ? formatReginaDate(r.date) : r.date,
      ),
    );

    const successes: string[] = [];
    const skipped: { date: string; reason: string }[] = [];
    const inserts: { date: string; token: string }[] = [];
    const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];

    for (const date of dates) {
      const isWeekend = [0, 6].includes(
        new Date(reginaStartOfDayISO(date)).getUTCDay(),
      );
      if (
        (isWeekend || holidaySet.has(date)) &&
        restrictedCategories.includes(slot.category_name)
      ) {
        skipped.push({
          date,
          reason: 'Role not bookable on holidays or weekends',
        });
        continue;
      }

      if ((capacityMap.get(date) ?? 0) >= Number(slot.max_volunteers)) {
        skipped.push({ date, reason: 'Role is full' });
        continue;
      }

      if (existingSet.has(date)) {
        skipped.push({ date, reason: 'Already booked' });
        continue;
      }

      if (overlapSet.has(date)) {
        skipped.push({ date, reason: 'Overlapping booking' });
        continue;
      }

      const token = randomUUID();
      inserts.push({ date, token });
      successes.push(date);
    }

    if (inserts.length) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const params: any[] = [roleId, user.id, recurringId];
        const values = inserts
          .map((_, i) => `($${i * 2 + 4}::date, $${i * 2 + 5})`)
          .join(', ');
        params.push(...inserts.flatMap((i) => [i.date, i.token]));
        const sql = `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, status, reschedule_token, recurring_id)
                     SELECT $1, $2, v.date, 'approved', v.token, $3
                     FROM (VALUES ${values}) AS v(date, token)`;
        await client.query(sql, params);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      if (user.email) {
        for (const { date, token } of inserts) {
          const body = `Date: ${formatReginaDateWithDay(date)} from ${formatTimeToAmPm(
            slot.start_time,
          )} to ${formatTimeToAmPm(slot.end_time)}`;
          const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(token);
          await sendTemplatedEmail({
            to: user.email!,
            templateId: config.volunteerBookingReminderTemplateId,
            params: { body, cancelLink, rescheduleLink, type: 'Volunteer Shift' },
          });
        }
      } else if (successes.length) {
        logger.warn(
          'Volunteer booking confirmation email not sent. Volunteer %s has no email.',
          user.id,
        );
      }
    }

    res.status(201).json({ recurringId, successes, skipped });
  } catch (error) {
    logger.error('Error creating recurring volunteer bookings:', error);
    next(error);
  }
}

export async function createRecurringVolunteerBookingForVolunteer(
  req: Request<{}, {}, CreateRecurringVolunteerBookingForVolunteerRequest>,
  res: Response,
  next: NextFunction,
) {
  const {
    volunteerId,
    roleId,
    startDate,
    endDate,
    pattern,
    daysOfWeek = [],
    force,
  } = req.body;
  if (!volunteerId || !roleId || !startDate || !endDate || !pattern) {
    return res
      .status(400)
      .json({
        message:
          'volunteerId, roleId, startDate, endDate and pattern are required',
      });
  }
  try {
    const slotRes = await pool.query(
      `SELECT vs.role_id, vs.max_volunteers, vs.start_time, vs.end_time, vmr.name AS category_name
       FROM volunteer_slots vs
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       WHERE vs.slot_id = $1 AND vs.is_active`,
      [roleId],
    );
    if ((slotRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const slot = slotRes.rows[0];

    const trainedRes = await pool.query(
      'SELECT 1 FROM volunteer_trained_roles WHERE volunteer_id = $1 AND role_id = $2',
      [volunteerId, slot.role_id],
    );
    if ((trainedRes.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: 'Volunteer not trained for this role' });
    }

    const volunteerRes = await pool.query(
      'SELECT email FROM volunteers WHERE id=$1',
      [volunteerId],
    );
    const volunteerEmail = volunteerRes.rows[0]?.email as string | undefined;

    const recurringRes = await pool.query(
      `INSERT INTO volunteer_recurring_bookings (volunteer_id, slot_id, start_date, end_date, pattern, days_of_week, active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       RETURNING id`,
      [volunteerId, roleId, startDate, endDate, pattern, daysOfWeek],
    );
    const recurringId = recurringRes.rows[0].id;
    const dates: string[] = [];
    const start = new Date(reginaStartOfDayISO(startDate));
    const end = new Date(reginaStartOfDayISO(endDate));
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      if (
        pattern === 'daily' ||
        (pattern === 'weekly' && daysOfWeek.includes(d.getUTCDay()))
      ) {
        dates.push(formatReginaDate(d));
      }
    }

    const [holidays, capacityRes, existingRes, overlapRes] = await Promise.all([
      getHolidays(),
      pool.query(
        `SELECT date, COUNT(*)
         FROM volunteer_bookings
         WHERE slot_id=$1 AND date BETWEEN $2 AND $3 AND status='approved'
         GROUP BY date`,
        [roleId, startDate, endDate],
      ),
      pool.query(
        `SELECT date FROM volunteer_bookings
         WHERE slot_id=$1 AND volunteer_id=$2 AND date BETWEEN $3 AND $4 AND status='approved'`,
        [roleId, volunteerId, startDate, endDate],
      ),
      pool.query(
        `SELECT vb.date
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         WHERE vb.volunteer_id=$1 AND vb.date BETWEEN $2 AND $3 AND vb.status='approved'
           AND NOT (vs.end_time <= $4 OR vs.start_time >= $5)`,
        [volunteerId, startDate, endDate, slot.start_time, slot.end_time],
      ),
    ]);

    const holidaySet = new Set(
      holidays
        .filter(h => h.date >= startDate && h.date <= endDate)
        .map(h => h.date),
    );
    const capacityMap = new Map<string, number>();
    for (const row of capacityRes.rows) {
      const key = row.date instanceof Date ? formatReginaDate(row.date) : row.date;
      capacityMap.set(key, Number(row.count));
    }
    const existingSet = new Set(
      existingRes.rows.map((r: any) =>
        r.date instanceof Date ? formatReginaDate(r.date) : r.date,
      ),
    );
    const overlapSet = new Set(
      overlapRes.rows.map((r: any) =>
        r.date instanceof Date ? formatReginaDate(r.date) : r.date,
      ),
    );

    const successes: string[] = [];
    const skipped: { date: string; reason: string }[] = [];
    const inserts: { date: string; token: string }[] = [];
    const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
    let newCapacity = Number(slot.max_volunteers);

    for (const date of dates) {
      const isWeekend = [0, 6].includes(
        new Date(reginaStartOfDayISO(date)).getUTCDay(),
      );
      if (
        (isWeekend || holidaySet.has(date)) &&
        restrictedCategories.includes(slot.category_name)
      ) {
        skipped.push({
          date,
          reason: 'Role not bookable on holidays or weekends',
        });
        continue;
      }

      const count = capacityMap.get(date) ?? 0;
      if (count >= Number(slot.max_volunteers)) {
        if (force) {
          newCapacity = Math.max(newCapacity, count + 1);
        } else {
          skipped.push({ date, reason: 'Role is full' });
          continue;
        }
      }

      if (existingSet.has(date)) {
        skipped.push({ date, reason: 'Already booked' });
        continue;
      }

      if (overlapSet.has(date)) {
        skipped.push({ date, reason: 'Overlapping booking' });
        continue;
      }

      const token = randomUUID();
      inserts.push({ date, token });
      successes.push(date);
    }

    if (inserts.length) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (force && newCapacity > Number(slot.max_volunteers)) {
          await client.query(
            'UPDATE volunteer_slots SET max_volunteers = $1 WHERE slot_id = $2',
            [newCapacity, roleId],
          );
        }
        const params: any[] = [roleId, volunteerId, recurringId];
        const values = inserts
          .map((_, i) => `($${i * 2 + 4}, $${i * 2 + 5})`)
          .join(', ');
        params.push(...inserts.flatMap((i) => [i.date, i.token]));
        const sql = `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, status, reschedule_token, recurring_id)
                     SELECT $1, $2, v.date, 'approved', v.token, $3
                     FROM (VALUES ${values}) AS v(date, token)`;
        await client.query(sql, params);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      if (volunteerEmail) {
        for (const { date, token } of inserts) {
          const body = `Date: ${formatReginaDateWithDay(date)} from ${formatTimeToAmPm(
            slot.start_time,
          )} to ${formatTimeToAmPm(slot.end_time)}`;
          const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(token);
          await sendTemplatedEmail({
            to: volunteerEmail,
            templateId: config.volunteerBookingReminderTemplateId,
            params: { body, cancelLink, rescheduleLink, type: 'Volunteer Shift' },
          });
        }
      } else if (successes.length) {
        logger.warn(
          'Volunteer booking confirmation email not sent. Volunteer %s has no email.',
          volunteerId,
        );
      }
    }

    res.status(201).json({ recurringId, successes, skipped });
  } catch (error) {
    logger.error('Error creating recurring volunteer bookings for volunteer:', error);
    next(error);
  }
}

export async function listRecurringVolunteerBookingsByVolunteer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { volunteer_id } = req.params as { volunteer_id?: string };
  try {
    const result = await pool.query(
      `SELECT id, slot_id AS role_id, start_date, end_date, pattern, days_of_week
       FROM volunteer_recurring_bookings
       WHERE volunteer_id=$1 AND active
       ORDER BY start_date`,
      [volunteer_id],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error(
      'Error listing recurring volunteer bookings by volunteer:',
      error,
    );
    next(error);
  }
}

export async function listMyRecurringVolunteerBookings(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await pool.query(
      `SELECT id, slot_id AS role_id, start_date, end_date, pattern, days_of_week
       FROM volunteer_recurring_bookings
       WHERE volunteer_id=$1 AND active
       ORDER BY start_date`,
      [user.id],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing recurring volunteer bookings:', error);
    next(error);
  }
}

export async function cancelVolunteerBookingOccurrence(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };
  const cancelReason = reason || 'volunteer_cancelled';
  try {
    const bookingRes = await pool.query(
      `SELECT id, slot_id, volunteer_id, date, status, recurring_id, reschedule_token
       FROM volunteer_bookings WHERE id=$1`,
      [id],
    );
    if ((bookingRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookingRes.rows[0];
    const bookingDate = new Date(reginaStartOfDayISO(booking.date));
    const today = new Date(reginaStartOfDayISO(new Date()));
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }
    if (bookingDate < today) {
      return res.status(400).json({ message: 'Booking already occurred' });
    }
    await pool.query(
      `UPDATE volunteer_bookings SET status='cancelled', reason=$2 WHERE id=$1`,
      [id, cancelReason],
    );
    const volunteerRes = await pool.query(
      'SELECT email, first_name, last_name FROM volunteers WHERE id=$1',
      [booking.volunteer_id],
    );
    const { email: volunteerEmail, first_name, last_name } = volunteerRes.rows[0] || {};
    const slotRes = await pool.query(
      'SELECT start_time, end_time FROM volunteer_slots WHERE slot_id=$1',
      [booking.slot_id],
    );
    const slot = slotRes.rows[0];
    const dateStr =
      booking.date instanceof Date
        ? formatReginaDate(booking.date)
        : booking.date;
    const formatted = formatReginaDateWithDay(dateStr);
    const subject = `Volunteer booking cancelled for ${formatted} ${formatTimeToAmPm(
      slot.start_time,
    )}-${formatTimeToAmPm(slot.end_time)}`;
    const body = `Date: ${formatted} from ${formatTimeToAmPm(slot.start_time)} to ${formatTimeToAmPm(
      slot.end_time,
    )}. Reason: ${cancelReason}.`;
    if (volunteerEmail && req.user?.role === 'staff') {
      const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(
        booking.reschedule_token,
      );
      await sendTemplatedEmail({
        to: volunteerEmail,
        templateId: config.volunteerBookingReminderTemplateId,
        params: { body, cancelLink, rescheduleLink, type: 'Volunteer Shift' },
      });
    } else if (!volunteerEmail && req.user?.role === 'staff') {
      logger.warn(
        'Volunteer booking cancellation email not sent. Volunteer %s has no email.',
        booking.volunteer_id,
      );
    }
    booking.status = 'cancelled';
    booking.role_id = booking.slot_id;
    delete booking.slot_id;
    booking.status_color = statusColor(booking.status);
    booking.date = dateStr;
    booking.reason = cancelReason;
    const name = first_name && last_name ? `${first_name} ${last_name}` : 'Volunteer';
    await notifyOps(
      `${name} (volunteer) cancelled shift on ${formatReginaDateWithDay(dateStr)} at ${formatTimeToAmPm(slot.start_time)}${
        cancelReason ? ` (${cancelReason})` : ''
      }`,
    );
    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    logger.error('Error cancelling volunteer booking:', error);
    next(error);
  }
}

export async function cancelRecurringVolunteerBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const from =
    (req.query.from as string) ||
    formatReginaDate(new Date());
  const { reason } = req.body as { reason?: string };
  const cancelReason = reason || 'volunteer_cancelled';
  try {
    const infoRes = await pool.query(
      `SELECT vrb.volunteer_id, vrb.slot_id, v.email, vs.start_time, vs.end_time
       FROM volunteer_recurring_bookings vrb
       JOIN volunteers v ON vrb.volunteer_id = v.id
       JOIN volunteer_slots vs ON vrb.slot_id = vs.slot_id
       WHERE vrb.id = $1`,
      [id],
    );
    if ((infoRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Recurring booking not found' });
    }
    const info = infoRes.rows[0];
    await pool.query(
      `UPDATE volunteer_bookings SET status='cancelled', reason=$3
       WHERE recurring_id=$1 AND date >= $2`,
      [id, from, cancelReason],
    );
    await pool.query(
      `UPDATE volunteer_recurring_bookings
       SET active=false, end_date = COALESCE(end_date, $2::date)
       WHERE id=$1`,
      [id, from],
    );
    res.json({ message: 'Recurring bookings cancelled' });
  } catch (error) {
    logger.error('Error cancelling recurring volunteer bookings:', error);
    next(error);
  }
}

