import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

export async function addVolunteerRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { startTime, endTime, maxVolunteers, roleId, isWednesdaySlot } =
    req.body as {
      startTime?: string;
      endTime?: string;
      maxVolunteers?: number;
      roleId?: number;
      isWednesdaySlot?: boolean;
    };
  if (
    !startTime ||
    !endTime ||
    typeof maxVolunteers !== 'number' ||
    typeof roleId !== 'number'
  ) {
    return res
      .status(400)
      .json({
        message:
          'startTime, endTime, maxVolunteers and roleId are required',
      });
  }
  try {
    const result = await pool.query(
      `INSERT INTO volunteer_roles (start_time, end_time, max_volunteers, role_id, is_wednesday_slot)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, start_time, end_time, max_volunteers, role_id, is_wednesday_slot`,
      [startTime, endTime, maxVolunteers, roleId, isWednesdaySlot || false]
    );
    const row = result.rows[0];
    const master = await pool.query(
      'SELECT name, category FROM volunteer_master_roles WHERE id=$1',
      [row.role_id]
    );
    res.status(201).json({ ...row, ...master.rows[0] });
  } catch (error) {
    logger.error('Error adding volunteer role:', error);
    next(error);
  }
}

export async function listVolunteerRoles(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query(
      `SELECT vr.id, vmr.name, vmr.category, vr.start_time, vr.end_time, vr.max_volunteers, vr.role_id, vr.is_wednesday_slot
       FROM volunteer_roles vr
       JOIN volunteer_master_roles vmr ON vr.role_id = vmr.id
       ORDER BY vr.id`
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing volunteer roles:', error);
    next(error);
  }
}

export async function updateVolunteerRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const { startTime, endTime, maxVolunteers, roleId, isWednesdaySlot } =
    req.body as {
      startTime?: string;
      endTime?: string;
      maxVolunteers?: number;
      roleId?: number;
      isWednesdaySlot?: boolean;
    };
  if (
    !startTime ||
    !endTime ||
    typeof maxVolunteers !== 'number' ||
    typeof roleId !== 'number'
  ) {
    return res
      .status(400)
      .json({
        message:
          'startTime, endTime, maxVolunteers and roleId are required',
      });
  }
  try {
    const result = await pool.query(
      `UPDATE volunteer_roles
       SET start_time = $1, end_time = $2, max_volunteers = $3, role_id = $4, is_wednesday_slot = $5
       WHERE id = $6
       RETURNING id, start_time, end_time, max_volunteers, role_id, is_wednesday_slot`,
      [startTime, endTime, maxVolunteers, roleId, isWednesdaySlot || false, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const row = result.rows[0];
    const master = await pool.query(
      'SELECT name, category FROM volunteer_master_roles WHERE id=$1',
      [row.role_id]
    );
    res.json({ ...row, ...master.rows[0] });
  } catch (error) {
    logger.error('Error updating volunteer role:', error);
    next(error);
  }
}

export async function deleteVolunteerRole(req: Request, res: Response, next: NextFunction) {
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
    logger.error('Error deleting volunteer role:', error);
    next(error);
  }
}

export async function listVolunteerRolesForVolunteer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { date } = req.query as { date?: string };
  if (!date) {
    return res.status(400).json({ message: 'date query parameter is required' });
  }
  try {
    const volunteerRes = await pool.query(
      'SELECT role_id FROM volunteer_trained_roles WHERE volunteer_id=$1',
      [user.id]
    );
    if (volunteerRes.rowCount === 0) {
      return res.json([]);
    }
    const roleIds = volunteerRes.rows.map(r => r.role_id);
    const result = await pool.query(
      `SELECT vr.id, vmr.name, vmr.category, vr.start_time, vr.end_time, vr.max_volunteers, vr.role_id, vr.is_wednesday_slot,
              COALESCE(b.count,0) AS booked, $1::date AS date
       FROM volunteer_roles vr
       JOIN volunteer_master_roles vmr ON vr.role_id = vmr.id
       LEFT JOIN (
         SELECT role_id, COUNT(*) AS count
         FROM volunteer_bookings
         WHERE status IN ('pending','approved') AND date = $1
         GROUP BY role_id
       ) b ON vr.id = b.role_id
       WHERE vr.role_id = ANY($2::int[])
         AND (vr.is_wednesday_slot = false OR EXTRACT(DOW FROM $1::date) = 3)
       ORDER BY vr.start_time`,
      [date, roleIds]
    );
    const roles = result.rows.map((row: any) => ({
      ...row,
      booked: Number(row.booked),
      available: row.max_volunteers - Number(row.booked),
      status: Number(row.booked) >= row.max_volunteers ? 'booked' : 'available',
    }));
    res.json(roles);
  } catch (error) {
    logger.error('Error listing volunteer roles for volunteer:', error);
    next(error);
  }
}

