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
    roleId?: string | number;
    name?: string;
    startTime?: string;
    endTime?: string;
    maxVolunteers?: string | number;
    categoryId?: string | number;
    isWednesdaySlot?: boolean;
    isActive?: boolean;
  };

  const parsedRoleId =
    typeof roleId !== 'undefined' ? Number(roleId) : undefined;
  const parsedMaxVolunteers = Number(maxVolunteers);
  const parsedCategoryId =
    typeof categoryId !== 'undefined' ? Number(categoryId) : undefined;

  const hasRoleId =
    typeof parsedRoleId === 'number' && !Number.isNaN(parsedRoleId);

  if (
    !startTime ||
    !endTime ||
    Number.isNaN(parsedMaxVolunteers) ||
    (!hasRoleId && (!name || Number.isNaN(parsedCategoryId)))
  ) {
    return res.status(400).json({
      message:
        'startTime, endTime, and maxVolunteers are required; provide roleId or name and categoryId',
    });
  }
  try {
    let resolvedRoleId: number = parsedRoleId as number;
    if (!hasRoleId) {
      const existing = await pool.query(
        `SELECT id FROM volunteer_roles WHERE name=$1 AND category_id=$2`,
        [name, parsedCategoryId],
      );
      if ((existing.rowCount ?? 0) > 0) {
        resolvedRoleId = existing.rows[0].id;
      } else {
        try {
          const roleRes = await pool.query(
            `INSERT INTO volunteer_roles (name, category_id)
             VALUES ($1,$2)
             RETURNING id`,
            [name, parsedCategoryId],
          );
          resolvedRoleId = roleRes.rows[0].id;
        } catch (err) {
          const code = (err as { code?: string }).code;
          if (code === '23505') {
            await pool.query(
              "SELECT setval('volunteer_roles_id_seq', (SELECT COALESCE(MAX(id), 0) FROM volunteer_roles));",
            );
            const roleRes = await pool.query(
              `INSERT INTO volunteer_roles (name, category_id)
               VALUES ($1,$2)
               RETURNING id`,
              [name, parsedCategoryId],
            );
            resolvedRoleId = roleRes.rows[0].id;
          } else {
            throw err;
          }
        }
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
        parsedMaxVolunteers,
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
    const includeInactive = req.query.includeInactive === 'true';
    const whereClause = includeInactive
      ? ''
      : 'WHERE vs.is_active OR vs.slot_id IS NULL';
    const result = await pool.query(
      `SELECT vr.id,
              vr.category_id,
              vr.name,
              COALESCE(MAX(vs.max_volunteers), 0) AS max_volunteers,
              vmr.name AS category_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', vs.slot_id,
                    'start_time', vs.start_time,
                    'end_time', vs.end_time,
                    'is_wednesday_slot', vs.is_wednesday_slot,
                    'is_active', vs.is_active
                  )
                  ORDER BY vs.slot_id
                ) FILTER (WHERE vs.slot_id IS NOT NULL),
                '[]'
              ) AS shifts
       FROM volunteer_roles vr
       LEFT JOIN volunteer_slots vs ON vs.role_id = vr.id
       JOIN volunteer_master_roles vmr ON vr.category_id = vmr.id
       ${whereClause}
       GROUP BY vr.id, vr.category_id, vr.name, vmr.name
       ORDER BY vr.id`,
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
      maxVolunteers?: string | number;
      categoryId?: string | number;
      isWednesdaySlot?: boolean;
    };

  const parsedMaxVolunteers = Number(maxVolunteers);
  const parsedCategoryId =
    typeof categoryId !== 'undefined' ? Number(categoryId) : undefined;

  if (
    !name ||
    !startTime ||
    !endTime ||
    Number.isNaN(parsedMaxVolunteers) ||
    Number.isNaN(parsedCategoryId as number)
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
      [startTime, endTime, parsedMaxVolunteers, isWednesdaySlot || false, id]
    );
    if ((slotRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    const roleId = slotRes.rows[0].role_id;
    await pool.query(
      `UPDATE volunteer_roles SET name=$1, category_id=$2 WHERE id=$3`,
      [name, parsedCategoryId, roleId]
    );
    await pool.query(
      `UPDATE volunteer_trained_roles SET category_id=$1 WHERE role_id=$2`,
      [parsedCategoryId, roleId]
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
         WHERE status='approved' AND date = $1
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

export async function restoreDefaultVolunteerRoles(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'CREATE TEMP TABLE tmp_trained AS SELECT volunteer_id, role_id FROM volunteer_trained_roles',
    );

    await client.query(
      'TRUNCATE volunteer_slots, volunteer_roles, volunteer_master_roles RESTART IDENTITY CASCADE',
    );

    await client.query(`
      INSERT INTO volunteer_master_roles (id, name) VALUES
        (1, 'Pantry'),
        (2, 'Warehouse'),
        (3, 'Gardening'),
        (4, 'Administration'),
        (5, 'Special Events')
      ON CONFLICT DO NOTHING;
      SELECT setval('volunteer_master_roles_id_seq', (SELECT COALESCE(MAX(id), 0) FROM volunteer_master_roles));
    `);

    await client.query(`
      INSERT INTO volunteer_roles (id, name, category_id) VALUES
        (1, 'Food Sorter', 2),
        (2, 'Production Worker', 2),
        (3, 'Driver Assistant', 2),
        (4, 'Loading Dock Personnel', 2),
        (5, 'General Cleaning & Maintenance', 2),
        (6, 'Reception', 1),
        (7, 'Greeter / Pantry Assistant', 1),
        (8, 'Stock Person', 1),
        (9, 'Gardening Assistant', 3),
        (10, 'Event Organizer', 5),
        (11, 'Event Resource Specialist', 5),
        (12, 'Volunteer Marketing Associate', 4),
        (13, 'Client Resource Associate', 4),
        (14, 'Assistant Volunteer Coordinator', 4),
        (15, 'Volunteer Office Administrator', 4)
      ON CONFLICT (id) DO NOTHING;
      SELECT setval('volunteer_roles_id_seq', (SELECT COALESCE(MAX(id), 0) FROM volunteer_roles));
    `);

    await client.query(`
      INSERT INTO volunteer_slots (role_id, start_time, end_time, max_volunteers, is_wednesday_slot) VALUES
        (1, '09:00:00', '12:00:00', 3, false),
        (2, '09:00:00', '12:00:00', 3, false),
        (3, '09:00:00', '12:00:00', 1, false),
        (4, '09:00:00', '12:00:00', 1, false),
        (5, '08:00:00', '11:00:00', 1, false),
        (6, '09:00:00', '12:00:00', 1, false),
        (6, '12:30:00', '15:30:00', 1, false),
        (6, '15:30:00', '18:30:00', 1, true),
        (7, '09:00:00', '12:00:00', 3, false),
        (7, '12:30:00', '15:30:00', 3, false),
        (7, '15:30:00', '18:30:00', 3, true),
        (7, '16:30:00', '19:30:00', 3, true),
        (8, '08:00:00', '11:00:00', 1, false),
        (8, '12:00:00', '15:00:00', 1, false),
        (9, '13:00:00', '16:00:00', 2, false),
        (10, '09:00:00', '17:00:00', 5, false),
        (11, '09:00:00', '17:00:00', 5, false),
        (12, '08:00:00', '16:00:00', 1, false),
        (13, '08:00:00', '16:00:00', 1, false),
        (14, '08:00:00', '16:00:00', 1, false),
        (15, '08:00:00', '16:00:00', 1, false)
      ON CONFLICT (role_id, start_time, end_time) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO volunteer_trained_roles (volunteer_id, role_id, category_id)
      SELECT t.volunteer_id, t.role_id, vr.category_id
      FROM tmp_trained t
      JOIN volunteer_roles vr ON vr.id = t.role_id;
    `);

    await client.query('COMMIT');
    res.json({ message: 'Volunteer roles restored' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error restoring volunteer roles:', error);
    next(error);
  } finally {
    client.release();
  }
}
