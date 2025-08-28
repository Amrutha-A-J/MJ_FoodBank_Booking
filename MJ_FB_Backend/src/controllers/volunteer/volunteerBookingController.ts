import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import pool from '../../db';
import { sendEmail } from '../../utils/emailUtils';
import logger from '../../utils/logger';
import { CreateRecurringVolunteerBookingRequest } from '../../types/volunteerBooking';
import { formatReginaDate, reginaStartOfDayISO } from '../../utils/dateUtils';

const STATUS_COLORS: Record<string, string> = {
  pending: 'light orange',
  approved: 'green',
  rejected: 'red',
  cancelled: 'gray',
  no_show: 'red',
  expired: 'gray',
};

function statusColor(status: string) {
  return STATUS_COLORS[status] || null;
}

function mapBookingRow(b: any) {
  return {
    ...b,
    date:
      b.date instanceof Date ? b.date.toISOString().split('T')[0] : b.date,
    status_color: statusColor(b.status),
  };
}

export async function createVolunteerBooking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  const { roleId, date } = req.body as { roleId?: number; date?: string };
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!roleId || !date) {
    return res.status(400).json({ message: 'roleId and date are required' });
  }

  try {
    const slotRes = await pool.query(
      `SELECT vs.role_id, vs.max_volunteers, vmr.name AS category_name
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
      new Date(reginaStartOfDayISO(date)).getUTCDay(),
    );
    const holidayRes = await pool.query('SELECT 1 FROM holidays WHERE date = $1', [date]);
    const isHoliday = (holidayRes.rowCount ?? 0) > 0;
    const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
    if ((isWeekend || isHoliday) && restrictedCategories.includes(slot.category_name)) {
      return res.status(400).json({ message: 'Role not bookable on holidays or weekends' });
    }

    const existingRes = await pool.query(
      `SELECT 1 FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3 AND status IN ('pending','approved')`,
      [roleId, date, user.id]
    );
    if ((existingRes.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Already booked for this shift' });
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND status IN ('pending','approved')`,
      [roleId, date]
    );
    if (Number(countRes.rows[0].count) >= slot.max_volunteers) {
      return res.status(400).json({ message: 'Role is full' });
    }

    const token = randomUUID();
    const insertRes = await pool.query(
      `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, reschedule_token)
       VALUES ($1, $2, $3, $4)
       RETURNING id, slot_id, volunteer_id, date, status, reschedule_token, recurring_id`,
      [roleId, user.id, date, token]
    );

    await sendEmail(
      user.email || 'test@example.com',
      'Volunteer booking request received',
      `Volunteer booking request for role ${roleId} on ${date}`,
    );

    const booking = insertRes.rows[0];
    booking.role_id = booking.slot_id;
    delete booking.slot_id;
    booking.status_color = statusColor(booking.status);
    booking.date =
      booking.date instanceof Date
        ? booking.date.toISOString().split('T')[0]
        : booking.date;
    res.status(201).json(booking);
  } catch (error) {
    logger.error('Error creating volunteer booking:', error);
    next(error);
  }
}

export async function createVolunteerBookingForVolunteer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { volunteerId, roleId, date } = req.body as {
    volunteerId?: number;
    roleId?: number;
    date?: string;
  };
  if (!volunteerId || !roleId || !date) {
    return res
      .status(400)
      .json({ message: 'volunteerId, roleId and date are required' });
  }

  try {
    const slotRes = await pool.query(
      `SELECT vs.role_id, vs.max_volunteers, vmr.name AS category_name
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

    const isWeekend = [0, 6].includes(
      new Date(reginaStartOfDayISO(date)).getUTCDay(),
    );
    const holidayRes = await pool.query('SELECT 1 FROM holidays WHERE date = $1', [date]);
    const isHoliday = (holidayRes.rowCount ?? 0) > 0;
    const restrictedCategories = ['Pantry', 'Warehouse', 'Administrative'];
    if ((isWeekend || isHoliday) && restrictedCategories.includes(slot.category_name)) {
      return res.status(400).json({ message: 'Role not bookable on holidays or weekends' });
    }

    const existingRes = await pool.query(
      `SELECT 1 FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3 AND status IN ('pending','approved')`,
      [roleId, date, volunteerId]
    );
    if ((existingRes.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Already booked for this shift' });
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND status = 'approved'`,
      [roleId, date]
    );
    if (Number(countRes.rows[0].count) >= slot.max_volunteers) {
      return res.status(400).json({ message: 'Role is full' });
    }

    const token = randomUUID();
    const insertRes = await pool.query(
      `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, status, reschedule_token)
       VALUES ($1, $2, $3, 'approved', $4)
       RETURNING id, slot_id, volunteer_id, date, status, reschedule_token, recurring_id`,
      [roleId, volunteerId, date, token]
    );

    const booking = insertRes.rows[0];
    booking.role_id = booking.slot_id;
    delete booking.slot_id;
    booking.status_color = statusColor(booking.status);
    booking.date =
      booking.date instanceof Date
        ? booking.date.toISOString().split('T')[0]
        : booking.date;
    res.status(201).json(booking);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Already booked for this shift' });
    }
    logger.error('Error creating volunteer booking for volunteer:', error);
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
  const { status, reason } = req.body as {
    status?: string;
    reason?: string;
  };
  if (!status || !['approved', 'rejected', 'cancelled'].includes(status)) {
    return res
      .status(400)
      .json({ message: 'Status must be approved, rejected or cancelled' });
  }
  if (status === 'rejected' && !reason) {
    return res
      .status(400)
      .json({ message: 'Reason required for rejection' });
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

    if (status === 'approved') {
      if (booking.status !== 'pending') {
        return res.status(400).json({ message: 'Booking already processed' });
      }
      const roleRes = await pool.query(
        `SELECT max_volunteers FROM volunteer_slots WHERE slot_id=$1`,
        [booking.slot_id]
      );
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM volunteer_bookings
         WHERE slot_id=$1 AND date=$2 AND status='approved'`,
        [booking.slot_id, booking.date]
      );
      if (Number(countRes.rows[0].count) >= roleRes.rows[0].max_volunteers) {
        return res.status(400).json({ message: 'Role is full' });
      }
    } else if (status === 'rejected') {
      if (booking.status !== 'pending') {
        return res.status(400).json({ message: 'Booking already processed' });
      }
    } else if (status === 'cancelled') {
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
      `UPDATE volunteer_bookings SET status=$1, reason=$2 WHERE id=$3
       RETURNING id, slot_id, volunteer_id, date, status, recurring_id`,
      [status, reason || null, id]
    );
    const updated = updateRes.rows[0];
    updated.role_id = updated.slot_id;
    delete updated.slot_id;
    updated.status_color = statusColor(updated.status);
    updated.date =
      updated.date instanceof Date
        ? updated.date.toISOString().split('T')[0]
        : updated.date;
    await sendEmail(
      'test@example.com',
      `Volunteer booking ${status}`,
      `Volunteer booking ${id} ${status}.`,
    );
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
      `SELECT role_id, max_volunteers
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
       WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3 AND status IN ('pending','approved') AND id <> $4`,
      [roleId, date, booking.volunteer_id, booking.id]
    );
    if ((existingRes.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Already booked for this shift' });
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE slot_id = $1 AND date = $2 AND status IN ('pending','approved')`,
      [roleId, date],
    );
    if (Number(countRes.rows[0].count) >= slot.max_volunteers) {
      return res.status(400).json({ message: 'Role is full' });
    }

    const newToken = randomUUID();
    const isStaffReschedule = req.user && (req.user as any).role === 'staff';
    const newStatus =
      booking.status === 'approved' && !isStaffReschedule ? 'approved' : 'pending';
    await pool.query(
      'UPDATE volunteer_bookings SET slot_id=$1, date=$2, reschedule_token=$3, status=$4, reason=NULL WHERE id=$5',
      [roleId, date, newToken, newStatus, booking.id],
    );
    await sendEmail(
      'test@example.com',
      'Volunteer booking rescheduled',
      `Volunteer booking ${booking.id} was rescheduled`,
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
      `SELECT vs.role_id, vs.max_volunteers, vmr.name AS category_name
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
         WHERE slot_id = $1 AND date = $2 AND status IN ('pending','approved')`,
        [roleId, date],
      );
      if (Number(countRes.rows[0].count) >= slot.max_volunteers) {
        skipped.push({ date, reason: 'Role is full' });
        continue;
      }

      const existingRes = await pool.query(
        `SELECT 1 FROM volunteer_bookings
         WHERE slot_id = $1 AND date = $2 AND volunteer_id = $3 AND status IN ('pending','approved')`,
        [roleId, date, user.id],
      );
      if ((existingRes.rowCount ?? 0) > 0) {
        skipped.push({ date, reason: 'Already booked' });
        continue;
      }

      const token = randomUUID();
      await pool.query(
        `INSERT INTO volunteer_bookings (slot_id, volunteer_id, date, reschedule_token, recurring_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [roleId, user.id, date, token, recurringId],
      );
      successes.push(date);
    }
    res.status(201).json({ recurringId, successes, skipped });
  } catch (error) {
    logger.error('Error creating recurring volunteer bookings:', error);
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
  try {
    const bookingRes = await pool.query(
      `SELECT id, slot_id, volunteer_id, date, status, recurring_id
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
      `UPDATE volunteer_bookings SET status='cancelled' WHERE id=$1`,
      [id],
    );
    booking.status = 'cancelled';
    booking.role_id = booking.slot_id;
    delete booking.slot_id;
    booking.status_color = statusColor(booking.status);
    booking.date =
      booking.date instanceof Date
        ? booking.date.toISOString().split('T')[0]
        : booking.date;
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
  try {
    await pool.query(
      `UPDATE volunteer_bookings SET status='cancelled'
       WHERE recurring_id=$1 AND date >= $2`,
      [id, from],
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

