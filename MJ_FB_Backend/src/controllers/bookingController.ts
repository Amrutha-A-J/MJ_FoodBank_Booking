import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db';
import {
  isDateWithinCurrentOrNextMonth,
  countApprovedBookingsForMonth,
  updateBookingsThisMonth,
  LIMIT_MESSAGE,
  findUpcomingBooking,
} from '../utils/bookingUtils';
import { sendEmail } from '../utils/emailUtils';
import logger from '../utils/logger';

// Custom error to preserve HTTP status codes for capacity issues
class SlotCapacityError extends Error {
  status: number;
  constructor(message: string) {
    super(message);
    this.status = 400;
  }
}

// --- Helper: validate slot and check capacity ---
async function checkSlotCapacity(slotId: number, date: string) {
  const slotRes = await pool.query('SELECT * FROM slots WHERE id = $1', [slotId]);
  if (slotRes.rowCount === 0) throw new SlotCapacityError('Invalid slot');

  const approvedCountRes = await pool.query(
    `SELECT COUNT(*) FROM bookings WHERE slot_id=$1 AND date=$2 AND status='approved'`,
    [slotId, date]
  );
  const approvedCount = Number(approvedCountRes.rows[0].count);
  if (approvedCount >= slotRes.rows[0].max_capacity) {
    throw new SlotCapacityError('Slot full on selected date');
  }
}

// --- Create booking for logged-in shopper ---
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { slotId, date, isStaffBooking } = req.body;
  if (!slotId || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const slotIdNum = Number(slotId);
  if (Number.isNaN(slotIdNum)) {
    return res.status(400).json({ message: 'Invalid slot' });
  }

  try {
    const userId = Number((req.user as any).userId ?? req.user?.id);
    if (!isDateWithinCurrentOrNextMonth(date)) {
      return res.status(400).json({ message: 'Invalid booking date' });
    }

    const approvedCount = await countApprovedBookingsForMonth(userId, date);
    if (approvedCount >= 2) {
      return res.status(400).json({ message: LIMIT_MESSAGE });
    }

    const upcoming = await findUpcomingBooking(userId);
    if (upcoming) {
      return res.status(409).json({ message: 'Existing booking', existingBooking: upcoming });
    }

    await checkSlotCapacity(slotIdNum, date);
    const status = isStaffBooking ? 'approved' : 'submitted';
    const token = randomUUID();

    await pool.query(
      `INSERT INTO bookings (user_id, slot_id, status, request_data, date, is_staff_booking, reschedule_token)
       VALUES ($1, $2, $3, '', $4, $5, $6)`,
      [userId, slotIdNum, status, date, isStaffBooking || false, token]
    );

    await sendEmail(
      user.email || 'test@example.com',
      'Appointment request received',
      `Booking request submitted for ${date}`,
    );

    const newCount = await updateBookingsThisMonth(userId);
    res
      .status(201)
      .json({ message: 'Booking created', bookingsThisMonth: newCount, rescheduleToken: token });
  } catch (error: any) {
    logger.error('Error creating booking:', error);
    return next(error);
  }
}

// --- List all bookings (for staff) ---
export async function listBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const status = (req.query.status as string)?.toLowerCase();
    const params: any[] = [];
    let where = '';
    if (status) {
      const mapped = status === 'pending' ? 'submitted' : status;
      params.push(mapped);
      where = 'WHERE b.status = $1';
    }

    const result = await pool.query(
      `SELECT
        b.id, b.status, b.date, b.user_id, b.slot_id, b.is_staff_booking,
        b.reschedule_token,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email, u.phone as user_phone,
        u.client_id,
        (
          SELECT COUNT(*) FROM bookings b2
          WHERE b2.user_id = b.user_id
            AND b2.status = 'approved'
            AND DATE_TRUNC('month', b2.date) = DATE_TRUNC('month', b.date)
        ) AS bookings_this_month,
        s.start_time, s.end_time
      FROM bookings b
      INNER JOIN users u ON b.user_id = u.id
      INNER JOIN slots s ON b.slot_id = s.id
      ${where}
      ORDER BY b.date ASC, s.start_time ASC`,
      params,
    );
    res.json(result.rows);
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
    const bookingRes = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (bookingRes.rowCount === 0) return res.status(404).json({ message: 'Booking not found' });

    const booking = bookingRes.rows[0];
    if (booking.status !== 'submitted') {
      return res.status(400).json({ message: 'Booking already processed' });
    }

    if (decision === 'approve') {
      if (!isDateWithinCurrentOrNextMonth(booking.date)) {
        return res.status(400).json({ message: 'Invalid booking date' });
      }
      const approvedCount = await countApprovedBookingsForMonth(booking.user_id, booking.date);
      if (approvedCount >= 2) {
        return res.status(400).json({ message: LIMIT_MESSAGE });
      }
      await checkSlotCapacity(booking.slot_id, booking.date);
      await pool.query(`UPDATE bookings SET status='approved', request_data=$2 WHERE id=$1`, [bookingId, reason]);
      await updateBookingsThisMonth(booking.user_id);
    } else {
      await pool.query(`UPDATE bookings SET status='rejected', request_data=$2 WHERE id=$1`, [bookingId, reason]);
    }

    await sendEmail(
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
    const bookingRes = await pool.query('SELECT * FROM bookings WHERE id=$1', [bookingId]);
    if (bookingRes.rowCount === 0) return res.status(404).json({ message: 'Booking not found' });
    const booking = bookingRes.rows[0];

    const requesterId = Number((requester as any).userId ?? requester.id);
    if (requester.role !== 'staff' && booking.user_id !== requesterId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!['submitted', 'approved'].includes(booking.status)) {
      return res.status(400).json({ message: 'Only pending or approved bookings can be cancelled' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (booking.date < todayStr) {
      return res.status(400).json({ message: 'Cannot cancel past bookings' });
    }

    await pool.query(`UPDATE bookings SET status='cancelled', request_data=$2 WHERE id=$1`, [bookingId, reason]);
    if (booking.status === 'approved') {
      await updateBookingsThisMonth(booking.user_id);
    }

    await sendEmail(
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
    return res.status(400).json({ message: 'slotId and date are required' });
  }
  try {
    const bookingRes = await pool.query(
      'SELECT * FROM bookings WHERE reschedule_token = $1',
      [token],
    );
    if (bookingRes.rowCount === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookingRes.rows[0];
    if (!['submitted', 'approved', 'preapproved'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking cannot be rescheduled' });
    }
    if (!isDateWithinCurrentOrNextMonth(date)) {
      return res.status(400).json({ message: 'Invalid booking date' });
    }
    await checkSlotCapacity(slotId, date);
    const newToken = randomUUID();
    const isStaffReschedule = req.user && req.user.role === 'staff';
    const newStatus = isStaffReschedule ? booking.status : 'submitted';
    await pool.query(
      'UPDATE bookings SET slot_id=$1, date=$2, reschedule_token=$3, status=$4 WHERE id=$5',
      [slotId, date, newToken, newStatus, booking.id],
    );
    await updateBookingsThisMonth(booking.user_id);

    await sendEmail(
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
    return res.status(400).json({ message: 'Missing fields' });
  }

  if (!isDateWithinCurrentOrNextMonth(date)) {
    return res.status(400).json({ message: 'Invalid booking date' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // create dummy user with fake email and generated client ID
    const fakeEmail = `walkin_${Date.now()}@dummy.local`;
    const [firstName, ...lastParts] = name.split(' ');
    const lastName = lastParts.join(' ');
    const clientId = Math.floor(Math.random() * 9999999) + 1;
    const userRes = await client.query(
      `INSERT INTO users (first_name, last_name, email, phone, client_id, role)
       VALUES ($1, $2, $3, NULL, $4, 'shopper') RETURNING id`,
      [firstName, lastName, fakeEmail, clientId]
    );
    const newUserId = userRes.rows[0].id;

    const approvedCount = await countApprovedBookingsForMonth(newUserId, date);
    if (approvedCount >= 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: LIMIT_MESSAGE });
    }

    await checkSlotCapacity(slotId, date);
    const token = randomUUID();

    await client.query(
      `INSERT INTO bookings (user_id, slot_id, status, request_data, date, is_staff_booking, reschedule_token)
       VALUES ($1, $2, 'approved', $3, $4, TRUE, $5)`,
      [newUserId, slotId, requestData || '', date, token]
    );

    await client.query('COMMIT');
    await updateBookingsThisMonth(newUserId);
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
  if (!req.user || req.user.role !== 'staff')
    return res.status(403).json({ message: 'Forbidden' });

  const { userId, slotId, date, isStaffBooking } = req.body;
  if (!userId || !slotId || !date) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const slotIdNum = Number(slotId);
  if (Number.isNaN(slotIdNum)) {
    return res.status(400).json({ message: 'Invalid slot' });
  }

  try {
    if (!isDateWithinCurrentOrNextMonth(date)) {
      return res.status(400).json({ message: 'Invalid booking date' });
    }
    const approvedCount = await countApprovedBookingsForMonth(userId, date);
    if (approvedCount >= 2) {
      return res.status(400).json({ message: LIMIT_MESSAGE });
    }

    const upcoming = await findUpcomingBooking(userId);
    if (upcoming) {
      return res.status(409).json({ message: 'Existing booking', existingBooking: upcoming });
    }

    await checkSlotCapacity(slotIdNum, date);
    const status = isStaffBooking ? 'approved' : 'submitted';
    const token = randomUUID();

    await pool.query(
      `INSERT INTO bookings (user_id, slot_id, status, request_data, date, is_staff_booking, reschedule_token)
       VALUES ($1, $2, $3, '', $4, $5, $6)`,
      [userId, slotIdNum, status, date, isStaffBooking || false, token]
    );

    await updateBookingsThisMonth(userId);
    res.status(201).json({ message: 'Booking created for user', rescheduleToken: token });
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
    if (requester.role === 'staff') {
      const paramId = req.query.userId as string;
      if (!paramId) {
        return res.status(400).json({ message: 'userId query parameter required' });
      }
      userId = Number(paramId);
    } else {
      userId = Number((requester as any).userId ?? requester.id);
    }

    if (!userId) return res.status(400).json({ message: 'Invalid user' });

    const status = (req.query.status as string)?.toLowerCase();
    const past = req.query.past === 'true';

    const params: any[] = [userId];
    let where = "b.user_id = $1 AND b.date >= CURRENT_DATE - INTERVAL '6 months'";
    if (past) {
      where += ' AND b.date < CURRENT_DATE';
    }
    if (status) {
      const mapped = status === 'pending' ? 'submitted' : status;
      params.push(mapped);
      where += ` AND b.status = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT b.id, b.status, b.date, b.slot_id, b.request_data AS reason, s.start_time, s.end_time, b.created_at, b.is_staff_booking, b.reschedule_token
       FROM bookings b
       INNER JOIN slots s ON b.slot_id = s.id
       WHERE ${where}
       ORDER BY b.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching booking history:', error);
    next(error);
  }
}
