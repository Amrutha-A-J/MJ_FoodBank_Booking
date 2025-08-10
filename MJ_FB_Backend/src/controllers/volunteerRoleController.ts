import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

export async function addVolunteerRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { name, startTime, endTime, maxVolunteers, categoryId, isWednesdaySlot, isActive } =
    req.body as {
      name?: string;
      startTime?: string;
      endTime?: string;
      maxVolunteers?: number;
      categoryId?: number;
      isWednesdaySlot?: boolean;
      isActive?: boolean;
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
    let roleId: number;
    const existing = await pool.query(
      'SELECT id, max_volunteers, category_id FROM volunteer_roles WHERE name=$1 LIMIT 1',
      [name]
    );
    if ((existing.rowCount ?? 0) > 0) {
      roleId = existing.rows[0].id;
    } else {
      const roleRes = await pool.query(
        `INSERT INTO volunteer_roles (name, max_volunteers, category_id)
         VALUES ($1,$2,$3)
         RETURNING id, max_volunteers, category_id`,
        [name, maxVolunteers, categoryId]
      );
      roleId = roleRes.rows[0].id;
    }
    const slotRes = await pool.query(
      `INSERT INTO volunteer_slots (role_id, start_time, end_time, is_wednesday_slot, is_active)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING slot_id, start_time, end_time, is_wednesday_slot, is_active`,
      [
        roleId,
        startTime,
        endTime,
        isWednesdaySlot || false,
        typeof isActive === 'boolean' ? isActive : true,
      ]
    );
    const slot = slotRes.rows[0];
    const roleInfo = await pool.query(
      'SELECT name, max_volunteers, category_id FROM volunteer_roles WHERE id=$1',
      [roleId]
    );
    const master = await pool.query(
      'SELECT name FROM volunteer_master_roles WHERE id=$1',
      [roleInfo.rows[0].category_id]
    );
    res.status(201).json({
      id: slot.slot_id,
      role_id: roleId,
      name: roleInfo.rows[0].name,
      start_time: slot.start_time,
      end_time: slot.end_time,
      max_volunteers: roleInfo.rows[0].max_volunteers,
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
      `SELECT vs.slot_id AS id, vr.id AS role_id, vr.name, vs.start_time, vs.end_time,
              vr.max_volunteers, vr.category_id, vs.is_wednesday_slot, vs.is_active,
              vmr.name AS category_name
       FROM volunteer_slots vs
       JOIN volunteer_roles vr ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       WHERE vs.is_active
       ORDER BY vs.slot_id`
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
       SET start_time = $1, end_time = $2, is_wednesday_slot = $3
       WHERE slot_id = $4
       RETURNING role_id, slot_id, is_active`,
      [startTime, endTime, isWednesdaySlot || false, id]
    );
    if (slotRes.rowCount === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const roleId = slotRes.rows[0].role_id;
    await pool.query(
      `UPDATE volunteer_roles SET name=$1, max_volunteers=$2, category_id=$3 WHERE id=$4`,
      [name, maxVolunteers, categoryId, roleId]
    );
    const rowRes = await pool.query(
      `SELECT vs.slot_id AS id, vr.id AS role_id, vr.name, vs.start_time, vs.end_time,
              vr.max_volunteers, vr.category_id, vs.is_wednesday_slot, vs.is_active
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
                 vr.max_volunteers, vr.category_id, vs.is_wednesday_slot, vs.is_active, vmr.name AS category_name`,
      [isActive, id]
    );
    if (result.rowCount === 0) {
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
      `SELECT vs.slot_id AS id, vs.role_id, vr.name, vs.start_time, vs.end_time,
              vr.max_volunteers, vr.category_id, vs.is_wednesday_slot, vs.is_active,
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

export async function listVolunteerRoleGroupsForVolunteer(
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
      `SELECT vmr.id AS category_id, vmr.name AS category, vr.id AS role_id, vr.name,
              json_agg(json_build_object(
                'id', vs.slot_id,
                'role_id', vr.id,
                'name', vr.name,
                'start_time', vs.start_time,
                'end_time', vs.end_time,
                'max_volunteers', vr.max_volunteers,
                'category_id', vr.category_id,
                'category_name', vmr.name,
                'is_wednesday_slot', vs.is_wednesday_slot,
                'booked', COALESCE(b.count,0),
                'available', vr.max_volunteers - COALESCE(b.count,0),
                'status', CASE WHEN COALESCE(b.count,0) >= vr.max_volunteers THEN 'booked' ELSE 'available' END,
                'date', $1::date
              ) ORDER BY vs.start_time) AS slots
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
       GROUP BY vmr.id, vmr.name, vr.id, vr.name
       ORDER BY vmr.id, vr.id`,
      [date, roleIds]
    );
    const map = new Map<number, { category_id: number; category: string; roles: any[] }>();
    result.rows.forEach((row: any) => {
      const group = map.get(row.category_id) || {
        category_id: row.category_id,
        category: row.category,
        roles: [] as any[],
      };
      group.roles.push({ id: row.role_id, name: row.name, slots: row.slots });
      map.set(row.category_id, group);
    });
    res.json(Array.from(map.values()));
  } catch (error) {
    logger.error('Error listing volunteer role groups for volunteer:', error);
    next(error);
  }
}
