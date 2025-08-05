import { Request, Response } from 'express';
import pool from '../db';

const STATUS_COLORS: Record<string, string> = {
  pending: 'light orange',
  approved: 'green',
};

async function ensureVolunteerBookingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS volunteer_bookings (
      id SERIAL PRIMARY KEY,
      slot_id INTEGER NOT NULL REFERENCES volunteer_slots(id) ON DELETE CASCADE,
      volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

function statusColor(status: string) {
  return STATUS_COLORS[status] || null;
}

export async function createVolunteerBooking(req: Request, res: Response) {
  const user = req.user;
  const { slotId } = req.body as { slotId?: number };
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!slotId) {
    return res.status(400).json({ message: 'slotId is required' });
  }

  try {
    await ensureVolunteerBookingsTable();

    const slotRes = await pool.query(
      'SELECT role_id, max_volunteers FROM volunteer_slots WHERE id = $1',
      [slotId]
    );
    if (slotRes.rowCount === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    const slot = slotRes.rows[0];

    const volRes = await pool.query(
      'SELECT trained_areas FROM volunteers WHERE id = $1',
      [user.id]
    );
    if (volRes.rowCount === 0) {
      return res.status(403).json({ message: 'Volunteer not found' });
    }
    const trained = volRes.rows[0].trained_areas || [];
    if (!trained.includes(slot.role_id)) {
      return res.status(400).json({ message: 'Not trained for this role' });
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE slot_id = $1 AND status IN ('pending','approved')`,
      [slotId]
    );
    const currentCount = Number(countRes.rows[0].count);
    if (currentCount >= slot.max_volunteers) {
      return res.status(400).json({ message: 'Slot is full' });
    }

    const insertRes = await pool.query(
      `INSERT INTO volunteer_bookings (slot_id, volunteer_id)
       VALUES ($1, $2)
       RETURNING id, slot_id, volunteer_id, status`,
      [slotId, user.id]
    );

    const booking = insertRes.rows[0];
    booking.status_color = statusColor(booking.status);
    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating volunteer booking:', error);
    res.status(500).json({
      message: `Database error creating volunteer booking: ${(error as Error).message}`,
    });
  }
}

export async function listVolunteerBookingsByRole(req: Request, res: Response) {
  const { role_id } = req.params;
  try {
    await ensureVolunteerBookingsTable();
    const result = await pool.query(
      `SELECT vb.id, vb.status, vb.slot_id, vb.volunteer_id,
              vs.slot_date, vs.start_time, vs.end_time,
              u.first_name || ' ' || u.last_name AS volunteer_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.id
       JOIN users u ON vb.volunteer_id = u.id
       WHERE vs.role_id = $1
       ORDER BY vs.slot_date, vs.start_time`,
      [role_id]
    );
    const bookings = result.rows.map((b: any) => ({
      ...b,
      status_color: statusColor(b.status),
    }));
    res.json(bookings);
  } catch (error) {
    console.error('Error listing volunteer bookings:', error);
    res.status(500).json({
      message: `Database error listing volunteer bookings: ${(error as Error).message}`,
    });
  }
}

export async function listMyVolunteerBookings(req: Request, res: Response) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    await ensureVolunteerBookingsTable();
    const result = await pool.query(
      `SELECT vb.id, vb.status, vb.slot_id, vb.volunteer_id,
              vs.slot_date, vs.start_time, vs.end_time,
              vr.name AS role_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.id
       JOIN volunteer_roles_master vr ON vs.role_id = vr.id
       WHERE vb.volunteer_id = $1
       ORDER BY vs.slot_date DESC, vs.start_time DESC`,
      [user.id],
    );
    const bookings = result.rows.map((b: any) => ({
      ...b,
      status_color: statusColor(b.status),
    }));
    res.json(bookings);
  } catch (error) {
    console.error('Error listing volunteer bookings for volunteer:', error);
    res.status(500).json({
      message: `Database error listing volunteer bookings for volunteer: ${(error as Error).message}`,
    });
  }
}

export async function listVolunteerBookingsByVolunteer(req: Request, res: Response) {
  const { volunteer_id } = req.params;
  try {
    await ensureVolunteerBookingsTable();
    const result = await pool.query(
      `SELECT vb.id, vb.status, vb.slot_id, vb.volunteer_id,
              vs.slot_date, vs.start_time, vs.end_time,
              vr.name AS role_name
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.id
       JOIN volunteer_roles_master vr ON vs.role_id = vr.id
       WHERE vb.volunteer_id = $1
       ORDER BY vs.slot_date DESC, vs.start_time DESC`,
      [volunteer_id]
    );
    const bookings = result.rows.map((b: any) => ({
      ...b,
      status_color: statusColor(b.status),
    }));
    res.json(bookings);
  } catch (error) {
    console.error('Error listing volunteer bookings for volunteer:', error);
    res.status(500).json({
      message: `Database error listing volunteer bookings for volunteer: ${(error as Error).message}`,
    });
  }
}

export async function updateVolunteerBookingStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be approved or rejected' });
  }

  try {
    await ensureVolunteerBookingsTable();
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
      const slotRes = await pool.query(
        'SELECT max_volunteers FROM volunteer_slots WHERE id=$1',
        [booking.slot_id]
      );
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM volunteer_bookings
         WHERE slot_id=$1 AND status='approved'`,
        [booking.slot_id]
      );
      if (Number(countRes.rows[0].count) >= slotRes.rows[0].max_volunteers) {
        return res.status(400).json({ message: 'Slot is full' });
      }
    }

    const updateRes = await pool.query(
      `UPDATE volunteer_bookings SET status=$1 WHERE id=$2
       RETURNING id, slot_id, volunteer_id, status`,
      [status, id]
    );
    const updated = updateRes.rows[0];
    updated.status_color = statusColor(updated.status);
    res.json(updated);
  } catch (error) {
    console.error('Error updating volunteer booking:', error);
    res.status(500).json({
      message: `Database error updating volunteer booking: ${(error as Error).message}`,
    });
  }
}

