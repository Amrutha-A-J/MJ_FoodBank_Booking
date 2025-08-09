import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db';
import { sendEmail } from '../utils/emailUtils';
import logger from '../utils/logger';

const STATUS_COLORS: Record<string, string> = {
  pending: 'light orange',
  approved: 'green',
  rejected: 'red',
  cancelled: 'gray',
};

function statusColor(status: string) {
  return STATUS_COLORS[status] || null;
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
    const roleRes = await pool.query(
      'SELECT max_volunteers FROM volunteer_roles WHERE id = $1',
      [roleId]
    );
    if (roleRes.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const role = roleRes.rows[0];

    const volRes = await pool.query(
      'SELECT 1 FROM volunteer_trained_roles WHERE volunteer_id = $1 AND role_id = $2',
      [user.id, roleId]
    );
    if (volRes.rowCount === 0) {
      return res.status(400).json({ message: 'Not trained for this role' });
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE role_id = $1 AND date = $2 AND status IN ('pending','approved')`,
      [roleId, date]
    );
    if (Number(countRes.rows[0].count) >= role.max_volunteers) {
      return res.status(400).json({ message: 'Role is full' });
    }

    const token = randomUUID();
    const insertRes = await pool.query(
      `INSERT INTO volunteer_bookings (role_id, volunteer_id, date, reschedule_token)
       VALUES ($1, $2, $3, $4)
       RETURNING id, role_id, volunteer_id, date, status, reschedule_token`,
      [roleId, user.id, date, token]
    );

    await sendEmail(
      user.email || 'test@example.com',
      'Volunteer booking request received',
      `Volunteer booking request for role ${roleId} on ${date}`,
    );

    const booking = insertRes.rows[0];
    booking.status_color = statusColor(booking.status);
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
    const roleRes = await pool.query(
      'SELECT max_volunteers FROM volunteer_roles WHERE id = $1',
      [roleId]
    );
    if (roleRes.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const role = roleRes.rows[0];

    const trainedRes = await pool.query(
      'SELECT 1 FROM volunteer_trained_roles WHERE volunteer_id = $1 AND role_id = $2',
      [volunteerId, roleId]
    );
    if (trainedRes.rowCount === 0) {
      return res.status(400).json({ message: 'Volunteer not trained for this role' });
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE role_id = $1 AND date = $2 AND status = 'approved'`,
      [roleId, date]
    );
    if (Number(countRes.rows[0].count) >= role.max_volunteers) {
      return res.status(400).json({ message: 'Role is full' });
    }

    const token = randomUUID();
      const insertRes = await pool.query(
        `INSERT INTO volunteer_bookings (role_id, volunteer_id, date, status, reschedule_token)
         VALUES ($1, $2, $3, 'approved', $4)
         RETURNING id, role_id, volunteer_id, date, status, reschedule_token`,
        [roleId, volunteerId, date, token]
      );

    const booking = insertRes.rows[0];
    booking.status_color = statusColor(booking.status);
    res.status(201).json(booking);
  } catch (error) {
    logger.error('Error creating volunteer booking for volunteer:', error);
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
      `SELECT vb.id, vb.status, vb.role_id, vb.volunteer_id, vb.date,
              vr.start_time, vr.end_time, vr.name AS role_name,
              v.first_name || ' ' || v.last_name AS volunteer_name
       FROM volunteer_bookings vb
       JOIN volunteer_roles vr ON vb.role_id = vr.id
       JOIN volunteers v ON vb.volunteer_id = v.id
       WHERE vb.role_id = $1
       ORDER BY vb.date, vr.start_time`,
      [role_id]
    );
    const bookings = result.rows.map((b: any) => ({
      ...b,
      status_color: statusColor(b.status),
    }));
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
      `SELECT vb.id, vb.status, vb.role_id, vb.volunteer_id, vb.date,
              vr.start_time, vr.end_time,
              vr.name AS role_name
       FROM volunteer_bookings vb
       JOIN volunteer_roles vr ON vb.role_id = vr.id
       WHERE vb.volunteer_id = $1
       ORDER BY vb.date DESC, vr.start_time DESC`,
      [user.id]
    );
    const bookings = result.rows.map((b: any) => ({
      ...b,
      status_color: statusColor(b.status),
    }));
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
      `SELECT vb.id, vb.status, vb.role_id, vb.volunteer_id, vb.date,
              vr.start_time, vr.end_time,
              vr.name AS role_name
       FROM volunteer_bookings vb
       JOIN volunteer_roles vr ON vb.role_id = vr.id
       WHERE vb.volunteer_id = $1
       ORDER BY vb.date DESC, vr.start_time DESC`,
      [volunteer_id]
    );
    const bookings = result.rows.map((b: any) => ({
      ...b,
      status_color: statusColor(b.status),
    }));
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
  const { status } = req.body as { status?: string };
  if (!status || !['approved', 'rejected', 'cancelled'].includes(status)) {
    return res
      .status(400)
      .json({ message: 'Status must be approved, rejected or cancelled' });
  }

  try {
    const bookingRes = await pool.query('SELECT * FROM volunteer_bookings WHERE id=$1', [
      id,
    ]);
    if (bookingRes.rowCount === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookingRes.rows[0];
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Booking already processed' });
    }

    if (status === 'approved') {
      const roleRes = await pool.query(
        'SELECT max_volunteers FROM volunteer_roles WHERE id=$1',
        [booking.role_id]
      );
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM volunteer_bookings
         WHERE role_id=$1 AND date=$2 AND status='approved'`,
        [booking.role_id, booking.date]
      );
      if (Number(countRes.rows[0].count) >= roleRes.rows[0].max_volunteers) {
        return res.status(400).json({ message: 'Role is full' });
      }
    }

    const updateRes = await pool.query(
      `UPDATE volunteer_bookings SET status=$1 WHERE id=$2
       RETURNING id, role_id, volunteer_id, date, status`,
      [status, id]
    );
    const updated = updateRes.rows[0];
    updated.status_color = statusColor(updated.status);
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
    if (bookingRes.rowCount === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookingRes.rows[0];

    const trainedRes = await pool.query(
      'SELECT 1 FROM volunteer_trained_roles WHERE volunteer_id = $1 AND role_id = $2',
      [booking.volunteer_id, roleId],
    );
    if (trainedRes.rowCount === 0) {
      return res.status(400).json({ message: 'Volunteer not trained for this role' });
    }

    const roleRes = await pool.query(
      'SELECT max_volunteers FROM volunteer_roles WHERE id = $1',
      [roleId],
    );
    if (roleRes.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE role_id = $1 AND date = $2 AND status IN ('pending','approved')`,
      [roleId, date],
    );
    if (Number(countRes.rows[0].count) >= roleRes.rows[0].max_volunteers) {
      return res.status(400).json({ message: 'Role is full' });
    }

    const newToken = randomUUID();
    await pool.query(
      'UPDATE volunteer_bookings SET role_id=$1, date=$2, reschedule_token=$3 WHERE id=$4',
      [roleId, date, newToken, booking.id],
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

