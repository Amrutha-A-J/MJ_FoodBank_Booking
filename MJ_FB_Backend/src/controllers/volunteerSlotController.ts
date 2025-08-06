import { Request, Response } from 'express';
import pool from '../db';

async function ensureVolunteerSlotsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS volunteer_slots (
      id SERIAL PRIMARY KEY,
      role_id INTEGER NOT NULL REFERENCES volunteer_roles_master(id) ON DELETE CASCADE,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      max_volunteers INTEGER NOT NULL
    )
  `);
}

export async function addVolunteerSlot(req: Request, res: Response) {
  const { roleId, startTime, endTime, maxVolunteers } = req.body as {
    roleId?: number;
    startTime?: string;
    endTime?: string;
    maxVolunteers?: number;
  };

  if (!roleId || !startTime || !endTime || !maxVolunteers) {
    return res
      .status(400)
      .json({ message: 'roleId, startTime, endTime and maxVolunteers are required' });
  }

  try {
    await ensureVolunteerSlotsTable();
    const result = await pool.query(
      `INSERT INTO volunteer_slots (role_id, start_time, end_time, max_volunteers)
       VALUES ($1, $2, $3, $4)
       RETURNING id, role_id, start_time, end_time, max_volunteers`,
      [roleId, startTime, endTime, maxVolunteers]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding volunteer slot:', error);
    res.status(500).json({
      message: `Database error adding volunteer slot: ${(error as Error).message}`,
    });
  }
}

export async function listVolunteerSlots(req: Request, res: Response) {
  const { role_id } = req.query as {
    role_id?: string;
  };

  try {
    await ensureVolunteerSlotsTable();
    const params: any[] = [];
    let query =
      'SELECT id, role_id, start_time, end_time, max_volunteers FROM volunteer_slots';
    if (role_id) {
      params.push(role_id);
      query += ' WHERE role_id = $1';
    }
    query += ' ORDER BY start_time';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing volunteer slots:', error);
    res.status(500).json({
      message: `Database error listing volunteer slots: ${(error as Error).message}`,
    });
  }
}

export async function updateVolunteerSlot(req: Request, res: Response) {
  const { id } = req.params;
  const { roleId, startTime, endTime, maxVolunteers } = req.body as {
    roleId?: number;
    startTime?: string;
    endTime?: string;
    maxVolunteers?: number;
  };

  if (!roleId || !startTime || !endTime || !maxVolunteers) {
    return res
      .status(400)
      .json({ message: 'roleId, startTime, endTime and maxVolunteers are required' });
  }

  try {
    await ensureVolunteerSlotsTable();
    const result = await pool.query(
      `UPDATE volunteer_slots
       SET role_id = $1, start_time = $2, end_time = $3, max_volunteers = $4
       WHERE id = $5
       RETURNING id, role_id, start_time, end_time, max_volunteers`,
      [roleId, startTime, endTime, maxVolunteers, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating volunteer slot:', error);
    res.status(500).json({
      message: `Database error updating volunteer slot: ${(error as Error).message}`,
    });
  }
}

export async function deleteVolunteerSlot(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await ensureVolunteerSlotsTable();
    const result = await pool.query(
      `DELETE FROM volunteer_slots WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.json({ message: 'Slot deleted' });
  } catch (error) {
    console.error('Error deleting volunteer slot:', error);
    res.status(500).json({
      message: `Database error deleting volunteer slot: ${(error as Error).message}`,
    });
  }
}


export async function listVolunteerSlotsForVolunteer(req: Request, res: Response) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { date } = req.query as { date?: string };
  if (!date) {
    return res.status(400).json({ message: 'date query parameter is required' });
  }
  try {
    await ensureVolunteerSlotsTable();
    const volunteerRes = await pool.query(
      'SELECT trained_role_id FROM volunteers WHERE id=$1',
      [user.id]
    );
    if (volunteerRes.rowCount === 0) {
      return res.json([]);
    }
    const trained = volunteerRes.rows[0].trained_role_id;
    if (trained === null) {
      return res.json([]);
    }
    const result = await pool.query(
      `SELECT vs.id, vs.role_id, vr.name AS role_name, vs.start_time, vs.end_time, vs.max_volunteers,
              COALESCE(b.count,0) AS booked, $1::date AS date
       FROM volunteer_slots vs
       JOIN volunteer_roles_master vr ON vs.role_id = vr.id
       LEFT JOIN (
         SELECT slot_id, COUNT(*) AS count
         FROM volunteer_bookings
         WHERE status IN ('pending','approved') AND date = $1
         GROUP BY slot_id
       ) b ON vs.id = b.slot_id
       WHERE vs.role_id = $2
       ORDER BY vs.start_time`,
      [date, trained]
    );
    const slots = result.rows.map((row: any) => ({
      ...row,
      booked: Number(row.booked),
      available: row.max_volunteers - Number(row.booked),
      status: Number(row.booked) >= row.max_volunteers ? 'booked' : 'available',
    }));
    res.json(slots);
  } catch (error) {
    console.error('Error listing volunteer slots for volunteer:', error);
    res.status(500).json({
      message: `Database error listing volunteer slots for volunteer: ${(error as Error).message}`,
    });
  }
}
