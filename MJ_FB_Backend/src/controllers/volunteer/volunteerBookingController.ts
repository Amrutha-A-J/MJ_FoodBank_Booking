import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import pool from '../../db';
import {
  sendTemplatedEmail,
  buildCancelRescheduleLinks,
  buildCalendarLinks,
} from '../../utils/emailUtils';
import { enqueueEmail } from '../../utils/emailQueue';
import logger from '../../utils/logger';
import {
  CreateRecurringVolunteerBookingRequest,
  CreateRecurringVolunteerBookingForVolunteerRequest,
} from '../../types/volunteerBooking';
import { formatReginaDate, reginaStartOfDayISO } from '../../utils/dateUtils';
import config from '../../config';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateString(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

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
  const { roleId, date, type } = req.body as {
    roleId?: number;
    date?: string;
    type?: string;
  };
  const emailType = type || 'volunteer shift';
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
    const holidayRes = await pool.query('SELECT 1 FROM holidays WHERE date = $1', [date!]);
    const isHoliday = (holidayRes.rowCount ?? 0) > 0;
    const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
    if ((isWeekend || isHoliday) && restrictedCategories.includes(slot.category_name)) {
      return res.status(400).json({ message: 'Role not bookable on holidays or weekends' });
    }

    const existingRes = await pool.query(
      `SELECT 1 FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3 AND status='approved'`,
      [roleId, date!, user.id]
    );
    if ((existingRes.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Already booked for this shift' });
    }

    const overlapRes = await pool.query(
      `SELECT vb.id, vb.slot_id AS role_id, vb.date, vs.start_time, vs.end_time, vr.name AS role_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       WHERE vb.volunteer_id = $1 AND vb.date = $2 AND vb.status='approved'
         AND NOT (vs.end_time <= $3 OR vs.start_time >= $4)`,
      [user.id, date, slot.start_time, slot.end_time]
    );
    if ((overlapRes.rowCount ?? 0) > 0) {
      const existing = overlapRes.rows[0];
      return res.status(409).json({
        message: 'Booking overlaps an existing shift',
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
      const insertRes = await client.query(
        `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, status, reschedule_token)
         VALUES ($1, $2, $3, 'approved', $4)
         RETURNING id, slot_id, volunteer_id, date, status, reschedule_token, recurring_id`,
        [roleId, user.id, date, token],
      );

      await client.query('COMMIT');

      if (user.email) {
        const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(
          token,
        );
        const { googleCalendarLink, outlookCalendarLink } = buildCalendarLinks(
          date,
          slot.start_time,
          slot.end_time,
        );
        enqueueEmail({
          to: user.email,
          templateId: config.volunteerBookingConfirmationTemplateId,
          params: {
            body: `Volunteer booking for role ${roleId} on ${date} has been confirmed.`,
            cancelLink,
            rescheduleLink,
            googleCalendarLink,
            outlookCalendarLink,
            type: emailType,
          },
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
      res.status(201).json(booking);
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

    const isWeekend = [0, 6].includes(bookingDate.getUTCDay());
    const holidayRes = await pool.query('SELECT 1 FROM holidays WHERE date = $1', [date]);
    const isHoliday = (holidayRes.rowCount ?? 0) > 0;
    const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
    if ((isWeekend || isHoliday) && restrictedCategories.includes(slot.category_name)) {
      return res
        .status(400)
        .json({ message: 'Role not bookable on holidays or weekends' });
    }

    const existingRes = await pool.query(
      `SELECT 1 FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3 AND status='approved'`,
      [roleId, date, volunteerId]
    );
    if ((existingRes.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Already booked for this shift' });
    }

    const overlapRes = await pool.query(
      `SELECT vb.id, vb.slot_id AS role_id, vb.date, vs.start_time, vs.end_time, vr.name AS role_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       WHERE vb.volunteer_id=$1 AND vb.date=$2 AND vb.status='approved'
         AND NOT (vs.end_time <= $3 OR vs.start_time >= $4)`,
      [volunteerId, date, slot.start_time, slot.end_time]
    );
    if ((overlapRes.rowCount ?? 0) > 0) {
      const existing = overlapRes.rows[0];
      return res.status(409).json({
        message: 'Booking overlaps an existing shift',
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
          maxVolunteers = Number(countRes.rows[0].count) + 1;
          await client.query(
            'UPDATE volunteer_slots SET max_volunteers = $1 WHERE slot_id = $2',
            [maxVolunteers, roleId],
          );
        } else {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Role is full' });
        }
      }

      const token = randomUUID();
      const insertRes = await client.query(
        `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, status, reschedule_token)
         VALUES ($1, $2, $3, 'approved', $4)
         RETURNING id, slot_id, volunteer_id, date, status, reschedule_token, recurring_id`,
        [roleId, volunteerId, date, token],
      );

      await client.query('COMMIT');

      const booking = insertRes.rows[0];
      booking.role_id = booking.slot_id;
      delete booking.slot_id;
      booking.status_color = statusColor(booking.status);
      booking.date =
        booking.date instanceof Date
          ? formatReginaDate(booking.date)
          : booking.date;
      res.status(201).json(booking);
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
  const emailType = type || 'volunteer shift';

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
    const holidayRes = await pool.query('SELECT 1 FROM holidays WHERE date = $1', [date!]);
    const isHoliday = (holidayRes.rowCount ?? 0) > 0;
    const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
    if ((isWeekend || isHoliday) && restrictedCategories.includes(slot.category_name)) {
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

    const overlapRes = await pool.query(
      `SELECT 1
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       WHERE vb.volunteer_id = $1
         AND vb.date = $2
         AND vb.status='approved'
         AND vb.id <> $3
         AND NOT (vs.end_time <= $4 OR vs.start_time >= $5)`,
      [user.id, date!, existingBookingId, slot.start_time, slot.end_time]
    );
    if ((overlapRes.rowCount ?? 0) > 0) {
      return res
        .status(409)
        .json({ message: 'Booking overlaps an existing shift' });
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
      const { googleCalendarLink, outlookCalendarLink } = buildCalendarLinks(
        date!,
        slot.start_time,
        slot.end_time,
      );
      enqueueEmail({
        to: user.email,
        templateId: config.volunteerBookingConfirmationTemplateId,
        params: {
          body: `Volunteer booking for role ${roleId} on ${date!} has been confirmed.`,
          cancelLink,
          rescheduleLink,
          googleCalendarLink,
          outlookCalendarLink,
          type: emailType,
        },
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

export async function listVolunteerBookingsForReview(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { start, end } = req.query as { start?: string; end?: string };
    const startDate =
      start ?? formatReginaDate(new Date());
    const endDate =
      end ??
      new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
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
       WHERE vb.date BETWEEN $1 AND $2
         AND (
           vb.status = 'no_show'
           OR (vb.status = 'approved' AND vb.date = CURRENT_DATE AND vs.start_time < (CURRENT_TIME AT TIME ZONE 'America/Regina')::time)
         )
       ORDER BY vb.date, vs.start_time`,
      [startDate, endDate],
    );
    const bookings = result.rows.map(mapBookingRow);
    res.json(bookings);
  } catch (error) {
    logger.error('Error listing volunteer bookings for review:', error);
    next(error);
  }
}

export async function listVolunteerBookings(
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
       ORDER BY vb.date, vs.start_time`
    );
    const bookings = result.rows.map(mapBookingRow);
    res.json(bookings);
  } catch (error) {
    logger.error('Error listing volunteer bookings:', error);
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
      'SELECT * FROM volunteer_bookings WHERE id=$1',
      [id]
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
      'SELECT * FROM volunteer_bookings WHERE reschedule_token = $1',
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

    const newToken = randomUUID();
    await pool.query(
      "UPDATE volunteer_bookings SET slot_id=$1, date=$2, reschedule_token=$3, status='approved', reason=NULL WHERE id=$4",
      [roleId, date, newToken, booking.id],
    );
    res.json({ message: 'Volunteer booking rescheduled', rescheduleToken: newToken });
  } catch (error) {
    logger.error('Error rescheduling volunteer booking:', error);
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
    const successes: string[] = [];
    const skipped: { date: string; reason: string }[] = [];
    for (const date of dates) {
      const isWeekend = [0, 6].includes(
        new Date(reginaStartOfDayISO(date)).getUTCDay(),
      );
      const holidayRes = await pool.query('SELECT 1 FROM holidays WHERE date = $1', [
        date,
      ]);
      const isHoliday = (holidayRes.rowCount ?? 0) > 0;
      const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
      if (
        (isWeekend || isHoliday) &&
        restrictedCategories.includes(slot.category_name)
      ) {
        skipped.push({ date, reason: 'Role not bookable on holidays or weekends' });
        continue;
      }

      const countRes = await pool.query(
        `SELECT COUNT(*) FROM volunteer_bookings
         WHERE slot_id = $1 AND date = $2 AND status='approved'`,
        [roleId, date],
      );
      if (Number(countRes.rows[0].count) >= slot.max_volunteers) {
        skipped.push({ date, reason: 'Role is full' });
        continue;
      }

      const existingRes = await pool.query(
        `SELECT 1 FROM volunteer_bookings
         WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3 AND status='approved'`,
        [roleId, date, user.id],
      );
      if ((existingRes.rowCount ?? 0) > 0) {
        skipped.push({ date, reason: 'Already booked' });
        continue;
      }

      const overlapRes = await pool.query(
        `SELECT vb.id, vs.start_time, vs.end_time
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         WHERE vb.volunteer_id=$1 AND vb.date=$2 AND vb.status='approved'
           AND NOT (vs.end_time <= $3 OR vs.start_time >= $4)`,
        [user.id, date, slot.start_time, slot.end_time],
      );
      if ((overlapRes.rowCount ?? 0) > 0) {
        skipped.push({ date, reason: 'Overlapping booking' });
        continue;
      }

      const token = randomUUID();
      try {
        await pool.query(
          `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, status, reschedule_token, recurring_id)
           VALUES ($1,$2,$3,'approved',$4,$5)`,
          [roleId, user.id, date, token, recurringId],
        );
      } catch (err: any) {
        if (err.code === '23505') {
          skipped.push({ date, reason: 'Already booked' });
          continue;
        }
        throw err;
      }
      successes.push(date);

      const subject = `Volunteer booking confirmed for ${date} ${slot.start_time}-${slot.end_time}`;
      const body = `Your volunteer booking on ${date} from ${slot.start_time} to ${slot.end_time} has been confirmed.`;
      if (user.email) {
        const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(token);
        await sendTemplatedEmail({
          to: user.email,
          templateId: config.volunteerBookingReminderTemplateId,
          params: {
            body,
            cancelLink,
            rescheduleLink,
            type: 'volunteer shift',
          },
        });
      } else {
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
    const successes: string[] = [];
    const skipped: { date: string; reason: string }[] = [];
    for (const date of dates) {
      const isWeekend = [0, 6].includes(
        new Date(reginaStartOfDayISO(date)).getUTCDay(),
      );
      const holidayRes = await pool.query('SELECT 1 FROM holidays WHERE date = $1', [
        date,
      ]);
      const isHoliday = (holidayRes.rowCount ?? 0) > 0;
      const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
      if (
        (isWeekend || isHoliday) &&
        restrictedCategories.includes(slot.category_name)
      ) {
        skipped.push({ date, reason: 'Role not bookable on holidays or weekends' });
        continue;
      }

      const countRes = await pool.query(
        `SELECT COUNT(*) FROM volunteer_bookings
         WHERE slot_id = $1 AND date = $2 AND status='approved'`,
        [roleId, date],
      );
      if (Number(countRes.rows[0].count) >= slot.max_volunteers) {
        if (force) {
          await pool.query(
            'UPDATE volunteer_slots SET max_volunteers = $1 WHERE slot_id = $2',
            [Number(countRes.rows[0].count) + 1, roleId],
          );
        } else {
          skipped.push({ date, reason: 'Role is full' });
          continue;
        }
      }

      const existingRes = await pool.query(
        `SELECT 1 FROM volunteer_bookings
         WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3 AND status='approved'`,
        [roleId, date, volunteerId],
      );
      if ((existingRes.rowCount ?? 0) > 0) {
        skipped.push({ date, reason: 'Already booked' });
        continue;
      }

      const overlapRes = await pool.query(
        `SELECT vb.id, vs.start_time, vs.end_time
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         WHERE vb.volunteer_id=$1 AND vb.date=$2 AND vb.status='approved'
           AND NOT (vs.end_time <= $3 OR vs.start_time >= $4)`,
        [volunteerId, date, slot.start_time, slot.end_time],
      );
      if ((overlapRes.rowCount ?? 0) > 0) {
        skipped.push({ date, reason: 'Overlapping booking' });
        continue;
      }

      const token = randomUUID();
      try {
        await pool.query(
          `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, status, reschedule_token, recurring_id)
           VALUES ($1,$2,$3,'approved',$4,$5)`,
          [roleId, volunteerId, date, token, recurringId],
        );
      } catch (err: any) {
        if (err.code === '23505') {
          skipped.push({ date, reason: 'Already booked' });
          continue;
        }
        throw err;
      }
      successes.push(date);

      const subject = `Volunteer booking confirmed for ${date} ${slot.start_time}-${slot.end_time}`;
      const body = `Your volunteer booking on ${date} from ${slot.start_time} to ${slot.end_time} has been confirmed.`;
      if (volunteerEmail) {
        const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(token);
        await sendTemplatedEmail({
          to: volunteerEmail,
          templateId: config.volunteerBookingReminderTemplateId,
          params: {
            body,
            cancelLink,
            rescheduleLink,
            type: 'volunteer shift',
          },
        });
      } else {
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
    const volunteerRes = await pool.query('SELECT email FROM volunteers WHERE id=$1', [
      booking.volunteer_id,
    ]);
    const volunteerEmail = volunteerRes.rows[0]?.email;
    const slotRes = await pool.query(
      'SELECT start_time, end_time FROM volunteer_slots WHERE slot_id=$1',
      [booking.slot_id],
    );
    const slot = slotRes.rows[0];
    const dateStr =
      booking.date instanceof Date
        ? formatReginaDate(booking.date)
        : booking.date;
    const subject = `Volunteer booking cancelled for ${dateStr} ${slot.start_time}-${slot.end_time}`;
    const body = `Your volunteer booking on ${dateStr} from ${slot.start_time} to ${slot.end_time} has been cancelled. Reason: ${cancelReason}.`;
    if (volunteerEmail && req.user?.role === 'staff') {
      const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(
        booking.reschedule_token,
      );
      await sendTemplatedEmail({
        to: volunteerEmail,
        templateId: config.volunteerBookingReminderTemplateId,
        params: { body, cancelLink, rescheduleLink, type: 'volunteer shift' },
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
    res.json(booking);
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
    const subject = `Recurring volunteer bookings cancelled starting ${from} ${info.start_time}-${info.end_time}`;
    const body = `Your recurring volunteer bookings starting ${from} from ${info.start_time} to ${info.end_time} have been cancelled. Reason: ${cancelReason}.`;
    if (info.email && req.user?.role === 'staff') {
      await sendTemplatedEmail({
        to: info.email,
        templateId: config.volunteerBookingNotificationTemplateId,
        params: { subject, body },
      });
    } else if (!info.email && req.user?.role === 'staff') {
      logger.warn(
        'Volunteer booking cancellation email not sent. Volunteer %s has no email.',
        info.volunteer_id,
      );
    }
    res.json({ message: 'Recurring bookings cancelled' });
  } catch (error) {
    logger.error('Error cancelling recurring volunteer bookings:', error);
    next(error);
  }
}

