import { Request, Response } from 'express';
import pool from '../db';
import {
  isDateWithinCurrentOrNextMonth,
  countApprovedBookingsForMonth,
  updateBookingsThisMonth,
  LIMIT_MESSAGE,
} from '../utils/bookingUtils';

// --- Helper: validate slot and check capacity ---
async function checkSlotCapacity(slotId: number, date: string) {
  const slotRes = await pool.query('SELECT * FROM slots WHERE id = $1', [slotId]);
  if (slotRes.rowCount === 0) throw new Error('Invalid slot');

  const approvedCountRes = await pool.query(
    `SELECT COUNT(*) FROM bookings WHERE slot_id=$1 AND date=$2 AND status='approved'`,
    [slotId, date]
  );
  const approvedCount = Number(approvedCountRes.rows[0].count);
  if (approvedCount >= slotRes.rows[0].max_capacity) {
    throw new Error('Slot full on selected date');
  }
}

// --- Create booking for logged-in shopper ---
export async function createBooking(req: Request, res: Response) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { slotId, date, isStaffBooking } = req.body;
  if (!slotId || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    if (!isDateWithinCurrentOrNextMonth(date)) {
      return res.status(400).json({ message: 'Invalid booking date' });
    }

    const approvedCount = await countApprovedBookingsForMonth(Number(user.id), date);
    if (approvedCount >= 2) {
      return res.status(400).json({ message: LIMIT_MESSAGE });
    }

    await checkSlotCapacity(slotId, date);
    const status = isStaffBooking ? 'approved' : 'submitted';

    await pool.query(
      `INSERT INTO bookings (user_id, slot_id, status, request_data, date, is_staff_booking)`
       VALUES ($1, $2, $3, '', $4, $5)`,
      [user.id, slotId, status, date, isStaffBooking || false]
    );

    const newCount = await updateBookingsThisMonth(Number(user.id));
    res
      .status(201)
      .json({ message: 'Booking created', bookingsThisMonth: newCount });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(400).json({ message: error.message || 'Failed to create booking' });
  }
}

// --- List all bookings (for staff) ---
export async function listBookings(req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT
        b.id, b.status, b.date, b.user_id, b.slot_id, b.is_staff_booking,
        u.first_name || ' ' || u.last_name as user_name, u.email as user_email, u.phone as user_phone,
        s.start_time, s.end_time
      FROM bookings b
      INNER JOIN users u ON b.user_id = u.id
      INNER JOIN slots s ON b.slot_id = s.id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing bookings:', error);
    res
      .status(500)
      .json({ message: `Database error listing bookings: ${(error as Error).message}` });
  }
}

// --- Approve or reject booking ---
export async function decideBooking(req: Request, res: Response) {
  const bookingId = req.params.id;
  const decision = (req.body.decision as string)?.toLowerCase();

  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be approve or reject' });
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
      await pool.query(`UPDATE bookings SET status='approved' WHERE id=$1`, [bookingId]);
      await updateBookingsThisMonth(booking.user_id);
    } else {
      await pool.query(`UPDATE bookings SET status='rejected' WHERE id=$1`, [bookingId]);
    }

    res.json({ message: `Booking ${decision}d` });
  } catch (error: any) {
    console.error('Error deciding booking:', error);
    res.status(400).json({ message: error.message || 'Failed to process decision' });
  }
}

// --- Staff: create preapproved booking for walk-in user ---
export async function createPreapprovedBooking(req: Request, res: Response) {
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

    await client.query(
      `INSERT INTO bookings (user_id, slot_id, status, request_data, date, is_staff_booking)
       VALUES ($1, $2, 'approved', $3, $4, TRUE)`,
      [newUserId, slotId, requestData || '', date]
    );

    await client.query('COMMIT');
    await updateBookingsThisMonth(newUserId);
    res.status(201).json({ message: 'Preapproved booking created' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating preapproved booking:', error);
    res.status(400).json({ message: error.message || 'Failed to create preapproved booking' });
  } finally {
    client.release();
  }
}

// --- Staff: create booking for existing user ---
export async function createBookingForUser(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'staff')
    return res.status(403).json({ message: 'Forbidden' });

  const { userId, slotId, date, isStaffBooking } = req.body;
  if (!userId || !slotId || !date) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    if (!isDateWithinCurrentOrNextMonth(date)) {
      return res.status(400).json({ message: 'Invalid booking date' });
    }
    const approvedCount = await countApprovedBookingsForMonth(userId, date);
    if (approvedCount >= 2) {
      return res.status(400).json({ message: LIMIT_MESSAGE });
    }

    await checkSlotCapacity(slotId, date);
    const status = isStaffBooking ? 'approved' : 'submitted';

    await pool.query(
      `INSERT INTO bookings (user_id, slot_id, status, request_data, date, is_staff_booking)
       VALUES ($1, $2, $3, '', $4, $5)`,
      [userId, slotId, status, date, isStaffBooking || false]
    );

    await updateBookingsThisMonth(userId);
    res.status(201).json({ message: 'Booking created for user' });
  } catch (error: any) {
    console.error('Error creating booking for user:', error);
    res.status(400).json({ message: error.message || 'Failed to create booking' });
  }
}
