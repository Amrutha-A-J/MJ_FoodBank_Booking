import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';

export async function addVolunteerRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const {
    roleId,
    name,
    startTime,
    endTime,
    maxVolunteers,
    categoryId,
    isWednesdaySlot,
    isActive,
  } = req.body as {
    roleId?: number;
    name?: string;
    startTime?: string;
    endTime?: string;
    maxVolunteers?: number;
    categoryId?: number;
    isWednesdaySlot?: boolean;
    isActive?: boolean;
  };
  if (
    !startTime ||
    !endTime ||
    typeof maxVolunteers !== 'number' ||
    (typeof roleId !== 'number' && (!name || typeof categoryId !== 'number'))
  ) {
    return res.status(400).json({
      message:
        'startTime, endTime, and maxVolunteers are required; provide roleId or name and categoryId',
    });
  }
  try {
    let resolvedRoleId: number = roleId as number;
    if (typeof resolvedRoleId !== 'number') {
      const existing = await pool.query(
        `SELECT id FROM volunteer_roles WHERE name=$1 AND category_id=$2`,
        [name, categoryId],
      );
      if ((existing.rowCount ?? 0) > 0) {
        resolvedRoleId = existing.rows[0].id;
      } else {
        const roleRes = await pool.query(
          `INSERT INTO volunteer_roles (name, category_id)
           VALUES ($1,$2)
           RETURNING id`,
          [name, categoryId],
        );
        resolvedRoleId = roleRes.rows[0].id;
      }
    }
    const overlap = await pool.query(
      `SELECT 1 FROM volunteer_slots
       WHERE role_id = $1 AND is_active = TRUE
         AND NOT (end_time <= $2 OR start_time >= $3)
       LIMIT 1`,
      [resolvedRoleId, startTime, endTime]
    );
    if ((overlap.rowCount ?? 0) > 0) {
      return res
        .status(400)
        .json({ message: 'Slot times overlap existing slots' });
    }
    const slotRes = await pool.query(
      `INSERT INTO volunteer_slots (role_id, start_time, end_time, max_volunteers, is_wednesday_slot, is_active)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING slot_id, start_time, end_time, max_volunteers, is_wednesday_slot, is_active`,
      [
        resolvedRoleId,
        startTime,
        endTime,
        maxVolunteers,
        isWednesdaySlot || false,
        typeof isActive === 'boolean' ? isActive : true,
      ]
    );
    const slot = slotRes.rows[0];
    const roleInfo = await pool.query(
      'SELECT name, category_id FROM volunteer_roles WHERE id=$1',
      [resolvedRoleId]
    );
    const master = await pool.query(
      'SELECT name FROM volunteer_master_roles WHERE id=$1',
      [roleInfo.rows[0].category_id]
    );
    res.status(201).json({
      id: slot.slot_id,
      role_id: resolvedRoleId,
      name: roleInfo.rows[0].name,
      start_time: slot.start_time,
      end_time: slot.end_time,
      max_volunteers: slot.max_volunteers,
      category_id: roleInfo.rows[0].category_id,
      is_wednesday_slot: slot.is_wednesday_slot,
      is_active: slot.is_active,
      category_name: master.rows[0].name,
    });
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
        `SELECT vr.id, vr.category_id, vr.name,
                MAX(vs.max_volunteers) AS max_volunteers,
                vmr.name AS category_name,
                json_agg(
                  json_build_object(
                    'id', vs.slot_id,
                    'start_time', vs.start_time,
                    'end_time', vs.end_time,
                    'is_wednesday_slot', vs.is_wednesday_slot,
                    'is_active', vs.is_active
                  )
                  ORDER BY vs.slot_id
                ) AS shifts
       FROM volunteer_roles vr
       JOIN volunteer_slots vs ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       WHERE vs.is_active
       GROUP BY vr.id, vr.category_id, vr.name, vmr.name
       ORDER BY vr.id`
    );
    res.json(
      result.rows.map(row => ({
        id: row.id,
        category_id: row.category_id,
        name: row.name,
        max_volunteers: row.max_volunteers,
        category_name: row.category_name,
        shifts: row.shifts,
      })),
    );
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
  const { name, startTime, endTime, maxVolunteers, categoryId, isWednesdaySlot } =
    req.body as {
      name?: string;
      startTime?: string;
      endTime?: string;
      maxVolunteers?: number;
      categoryId?: number;
      isWednesdaySlot?: boolean;
    };
  if (
    !name ||
    !startTime ||
    !endTime ||
    typeof maxVolunteers !== 'number' ||
    typeof categoryId !== 'number'
  ) {
    return res
      .status(400)
      .json({
        message:
          'name, startTime, endTime, maxVolunteers and categoryId are required',
      });
  }
  try {
    const slotRes = await pool.query(
      `UPDATE volunteer_slots
       SET start_time = $1, end_time = $2, max_volunteers = $3, is_wednesday_slot = $4
       WHERE slot_id = $5
       RETURNING role_id, slot_id, is_active`,
      [startTime, endTime, maxVolunteers, isWednesdaySlot || false, id]
    );
    if ((slotRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const roleId = slotRes.rows[0].role_id;
    await pool.query(
      `UPDATE volunteer_roles SET name=$1, category_id=$2 WHERE id=$3`,
      [name, categoryId, roleId]
    );
    const rowRes = await pool.query(
        `SELECT vs.slot_id AS id, vr.id AS role_id, vr.name, vs.start_time, vs.end_time,
                vs.max_volunteers, vr.category_id, vs.is_wednesday_slot, vs.is_active
         FROM volunteer_slots vs
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       WHERE vs.slot_id=$1`,
      [id]
    );
    const row = rowRes.rows[0];
    const master = await pool.query(
      'SELECT name FROM volunteer_master_roles WHERE id=$1',
      [row.category_id]
    );
    res.json({ ...row, category_name: master.rows[0].name });
  } catch (error) {
    logger.error('Error updating volunteer role:', error);
    next(error);
  }
}

export async function updateVolunteerRoleStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive is required' });
  }
  try {
    const result = await pool.query(
      `UPDATE volunteer_slots vs
       SET is_active = $1
       FROM volunteer_roles vr, volunteer_master_roles vmr
       WHERE vs.slot_id = $2 AND vs.role_id = vr.id AND vr.category_id = vmr.id
        RETURNING vs.slot_id AS id, vr.id AS role_id, vr.name, vs.start_time, vs.end_time,
                  vs.max_volunteers, vr.category_id, vs.is_wednesday_slot, vs.is_active, vmr.name AS category_name`,
      [isActive, id]
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating volunteer role status:', error);
    next(error);
  }
}

export async function deleteVolunteerRole(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM volunteer_slots WHERE slot_id = $1 RETURNING slot_id`,
      [id]
    );
    if ((result.rowCount ?? 0) === 0) {
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
    if ((volunteerRes.rowCount ?? 0) === 0) {
      return res.json([]);
    }
    const roleIds = volunteerRes.rows.map(r => r.role_id);
    const result = await pool.query(
        `SELECT vs.slot_id AS id, vs.role_id, vr.name, vs.start_time, vs.end_time,
                vs.max_volunteers AS max_volunteers, vr.category_id, vs.is_wednesday_slot, vs.is_active,
                vmr.name AS category_name,
                COALESCE(b.count,0) AS booked, $1::date AS date
         FROM volunteer_slots vs
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       LEFT JOIN (
         SELECT slot_id, COUNT(*) AS count
         FROM volunteer_bookings
         WHERE status IN ('pending','approved') AND date = $1
         GROUP BY slot_id
       ) b ON vs.slot_id = b.slot_id
       WHERE vs.role_id = ANY($2::int[])
        AND vs.is_active
        AND (vs.is_wednesday_slot = false OR EXTRACT(DOW FROM $1::date) = 3)
       ORDER BY vs.start_time`,
      [date, roleIds]
    );
    const roles = result.rows.map((row: any) => ({
      id: row.id,
      role_id: row.role_id,
      name: row.name,
      start_time: row.start_time,
      end_time: row.end_time,
      max_volunteers: Number(row.max_volunteers),
      category_id: row.category_id,
      is_wednesday_slot: row.is_wednesday_slot,
      is_active: row.is_active,
      category_name: row.category_name,
      booked: Number(row.booked),
      available: Number(row.max_volunteers) - Number(row.booked),
      status:
        Number(row.booked) >= Number(row.max_volunteers)
          ? 'booked'
          : 'available',
      date: row.date,
    }));
    res.json(roles);
  } catch (error) {
    logger.error('Error listing volunteer roles for volunteer:', error);
    next(error);
  }
}
