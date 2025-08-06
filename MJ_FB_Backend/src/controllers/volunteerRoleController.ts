import { Request, Response } from 'express';
import pool from '../db';

export async function addVolunteerRole(req: Request, res: Response) {
  const { name, category, startTime, endTime, maxVolunteers } = req.body as {
    name?: string;
    category?: string;
    startTime?: string;
    endTime?: string;
    maxVolunteers?: number;
  };
  if (!name || !category || !startTime || !endTime || typeof maxVolunteers !== 'number') {
    return res
      .status(400)
      .json({
        message: 'Name, category, startTime, endTime and maxVolunteers are required',
      });
  }
  try {
    const result = await pool.query(
      `INSERT INTO volunteer_roles (name, category, start_time, end_time, max_volunteers)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, category, start_time, end_time, max_volunteers`,
      [name, category, startTime, endTime, maxVolunteers]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding volunteer role:', error);
    res.status(500).json({
      message: `Database error adding volunteer role: ${(error as Error).message}`,
    });
  }
}

export async function listVolunteerRoles(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT id, name, category, start_time, end_time, max_volunteers FROM volunteer_roles ORDER BY id`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing volunteer roles:', error);
    res.status(500).json({
      message: `Database error listing volunteer roles: ${(error as Error).message}`,
    });
  }
}

export async function updateVolunteerRole(req: Request, res: Response) {
  const { id } = req.params;
  const { name, category, startTime, endTime, maxVolunteers } = req.body as {
    name?: string;
    category?: string;
    startTime?: string;
    endTime?: string;
    maxVolunteers?: number;
  };
  if (!name || !category || !startTime || !endTime || typeof maxVolunteers !== 'number') {
    return res
      .status(400)
      .json({
        message: 'Name, category, startTime, endTime and maxVolunteers are required',
      });
  }
  try {
    const result = await pool.query(
      `UPDATE volunteer_roles
       SET name = $1, category = $2, start_time = $3, end_time = $4, max_volunteers = $5
       WHERE id = $6
       RETURNING id, name, category, start_time, end_time, max_volunteers`,
      [name, category, startTime, endTime, maxVolunteers, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating volunteer role:', error);
    res.status(500).json({
      message: `Database error updating volunteer role: ${(error as Error).message}`,
    });
  }
}

export async function deleteVolunteerRole(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM volunteer_roles WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json({ message: 'Role deleted' });
  } catch (error) {
    console.error('Error deleting volunteer role:', error);
    res.status(500).json({
      message: `Database error deleting volunteer role: ${(error as Error).message}`,
    });
  }
}

export async function listVolunteerRolesForVolunteer(req: Request, res: Response) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { date } = req.query as { date?: string };
  if (!date) {
    return res.status(400).json({ message: 'date query parameter is required' });
  }
  try {
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
      `SELECT vr.id, vr.name, vr.category, vr.start_time, vr.end_time, vr.max_volunteers,
              COALESCE(b.count,0) AS booked, $1::date AS date
       FROM volunteer_roles vr
       LEFT JOIN (
         SELECT role_id, COUNT(*) AS count
         FROM volunteer_bookings
         WHERE status IN ('pending','approved') AND date = $1
         GROUP BY role_id
       ) b ON vr.id = b.role_id
       WHERE vr.id = $2
       ORDER BY vr.start_time`,
      [date, trained]
    );
    const roles = result.rows.map((row: any) => ({
      ...row,
      booked: Number(row.booked),
      available: row.max_volunteers - Number(row.booked),
      status: Number(row.booked) >= row.max_volunteers ? 'booked' : 'available',
    }));
    res.json(roles);
  } catch (error) {
    console.error('Error listing volunteer roles for volunteer:', error);
    res.status(500).json({
      message: `Database error listing volunteer roles for volunteer: ${(error as Error).message}`,
    });
  }
}

