import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger';
import config from '../../config';
import { generatePasswordSetupToken, buildPasswordSetupEmailParams } from '../../utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../../utils/emailUtils';
import { reginaStartOfDayISO } from '../../utils/dateUtils';
import type { PoolClient } from 'pg';
import { normalizeEmail } from '../../utils/normalizeEmail';

export async function getVolunteerById(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const volunteerId = Number(id);
  if (!Number.isInteger(volunteerId) || volunteerId <= 0) {
    return res.status(400).json({ message: 'Invalid volunteer ID' });
  }

  try {
    const result = await pool.query<{
      id: number;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      password: string | null;
      user_id: number | null;
      trained_role_ids: (number | null)[] | null;
    }>(
      `SELECT v.id,
              v.first_name,
              v.last_name,
              v.email,
              v.phone,
              v.password,
              v.user_id,
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT vtr.role_id), NULL) AS trained_role_ids
         FROM volunteers v
         LEFT JOIN volunteer_trained_roles vtr ON v.id = vtr.volunteer_id
        WHERE v.id = $1
        GROUP BY v.id`,
      [volunteerId],
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    const row = result.rows[0];
    const trainedAreas = Array.isArray(row.trained_role_ids)
      ? row.trained_role_ids.filter((roleId): roleId is number => typeof roleId === 'number')
      : [];

    res.json({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      hasPassword: Boolean(row.password),
      hasShopper: row.user_id != null,
      clientId: row.user_id ?? null,
      trainedAreas,
    });
  } catch (error) {
    logger.error('Error fetching volunteer details:', error);
    next(error);
  }
}

export async function updateTrainedArea(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const { roleIds } = req.body as { roleIds?: number[] };
  if (!Array.isArray(roleIds) || roleIds.some(r => typeof r !== 'number')) {
    return res
      .status(400)
      .json({ message: 'roleIds must be provided as an array of numbers' });
  }
  try {
    const validRoles = await pool.query<{ id: number }>(
      `SELECT id FROM volunteer_roles WHERE id = ANY($1::int[])`,
      [roleIds]
    );
    const validRoleIds = new Set(validRoles.rows.map(r => r.id));
    const invalidIds = roleIds.filter(id => !validRoleIds.has(id));
    if (invalidIds.length) {
      return res.status(400).json({ message: 'Invalid roleIds', invalidIds });
    }
    await pool.query('DELETE FROM volunteer_trained_roles WHERE volunteer_id = $1', [id]);
    if (roleIds.length > 0) {
      await pool.query(
        `INSERT INTO volunteer_trained_roles (volunteer_id, role_id, category_id)
         SELECT $1, vr.id, vr.category_id FROM volunteer_roles vr WHERE vr.id = ANY($2::int[])`,
        [id, roleIds]
      );
    }
    res.json({ id: Number(id), roleIds });
  } catch (error) {
    logger.error('Error updating trained area:', error);
    next(error);
  }
}

export async function getVolunteerProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const profileRes = await pool.query(
      `SELECT id, first_name, last_name, email, phone, consent FROM volunteers WHERE id = $1`,
      [user.id],
    );
    if ((profileRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const trainedRes = await pool.query(
      `SELECT vr.name
         FROM volunteer_trained_roles vtr
         JOIN volunteer_roles vr ON vtr.role_id = vr.id
         WHERE vtr.volunteer_id = $1`,
      [user.id],
    );
    const row = profileRes.rows[0];
    return res.json({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      role: 'volunteer',
      trainedAreas: trainedRes.rows.map(r => r.name),
      consent: row.consent,
    });
  } catch (error) {
    logger.error('Error fetching volunteer profile:', error);
    next(error);
  }
}

export async function getVolunteerStatsById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const volunteerId = Number(id);
  if (!Number.isInteger(volunteerId) || volunteerId <= 0) {
    return res.status(400).json({ message: 'Invalid volunteer ID' });
  }
  try {
    const statsRes = await pool.query<{
      lifetime_hours: string;
      lifetime_shifts: string;
      ytd_hours: string;
      ytd_shifts: string;
      mtd_hours: string;
      mtd_shifts: string;
      most_roles: Array<{
        roleId: number | string;
        roleName: string;
        shifts: number | string;
        hours: number | string;
      }> | null;
      last_shift:
        | {
            date: string;
            roleId: number | string;
            roleName: string;
            hours: number | string;
          }
        | null;
    }>(
      `WITH bounds AS (
         SELECT timezone('Canada/Saskatchewan', now())::date AS today,
                date_trunc('month', timezone('Canada/Saskatchewan', now()))::date AS month_start,
                (date_trunc('month', timezone('Canada/Saskatchewan', now()))::date + INTERVAL '1 month')::date AS month_end,
                date_trunc('year', timezone('Canada/Saskatchewan', now()))::date AS year_start,
                (date_trunc('year', timezone('Canada/Saskatchewan', now()))::date + INTERVAL '1 year')::date AS year_end
       ), completed_bookings AS (
         SELECT vb.volunteer_id,
                vb.date,
                vs.start_time,
                vs.end_time,
                vs.role_id,
                vr.name AS role_name,
                EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600 AS hours
           FROM volunteer_bookings vb
           JOIN volunteer_slots vs ON vs.slot_id = vb.slot_id
           JOIN volunteer_roles vr ON vr.id = vs.role_id
          WHERE vb.volunteer_id = $1
            AND vb.status = 'completed'
            AND vb.date <= (SELECT today FROM bounds)
       ), aggregates AS (
         SELECT v.archived_hours + COALESCE(SUM(cb.hours), 0) AS lifetime_hours,
                v.archived_shifts + COALESCE(COUNT(cb.slot_id), 0) AS lifetime_shifts,
                COALESCE(SUM(cb.hours)
                  FILTER (WHERE cb.date >= bounds.year_start AND cb.date < bounds.year_end), 0) AS ytd_hours,
                COALESCE(COUNT(cb.slot_id)
                  FILTER (WHERE cb.date >= bounds.year_start AND cb.date < bounds.year_end), 0) AS ytd_shifts,
                COALESCE(SUM(cb.hours)
                  FILTER (WHERE cb.date >= bounds.month_start AND cb.date < bounds.month_end), 0) AS mtd_hours,
                COALESCE(COUNT(cb.slot_id)
                  FILTER (WHERE cb.date >= bounds.month_start AND cb.date < bounds.month_end), 0) AS mtd_shifts
           FROM volunteers v
           CROSS JOIN bounds
           LEFT JOIN completed_bookings cb ON cb.volunteer_id = v.id
          WHERE v.id = $1
          GROUP BY v.archived_hours, v.archived_shifts
       ), role_summary AS (
         SELECT role_id,
                role_name,
                COUNT(*) AS shifts,
                COALESCE(SUM(hours), 0) AS hours
           FROM completed_bookings
          GROUP BY role_id, role_name
       ), ranked_roles AS (
         SELECT role_id,
                role_name,
                shifts,
                hours,
                ROW_NUMBER() OVER (ORDER BY shifts DESC, hours DESC, role_name ASC) AS rn
           FROM role_summary
       )
       SELECT aggregates.lifetime_hours,
              aggregates.lifetime_shifts,
              aggregates.ytd_hours,
              aggregates.ytd_shifts,
              aggregates.mtd_hours,
              aggregates.mtd_shifts,
              COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                  'roleId', role_id,
                  'roleName', role_name,
                  'shifts', shifts,
                  'hours', hours
                ) ORDER BY shifts DESC, hours DESC, role_name ASC)
                  FROM ranked_roles
                 WHERE rn <= 3
              ), '[]'::json) AS most_roles,
              (
                SELECT row_to_json(ls)
                  FROM (
                    SELECT date,
                           role_id AS "roleId",
                           role_name AS "roleName",
                           hours
                      FROM completed_bookings
                     ORDER BY date DESC, start_time DESC
                     LIMIT 1
                  ) ls
              ) AS last_shift
         FROM aggregates`,
      [volunteerId],
    );

    if ((statsRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    const row = statsRes.rows[0];
    const mostRoles = Array.isArray(row?.most_roles)
      ? row.most_roles.map(role => ({
          roleId: Number(role.roleId),
          roleName: role.roleName,
          shifts: Number(role.shifts),
          hours: Number(role.hours),
        }))
      : [];
    const lastShift = row?.last_shift
      ? {
          date: row.last_shift.date,
          roleId: Number(row.last_shift.roleId),
          roleName: row.last_shift.roleName,
          hours: Number(row.last_shift.hours),
        }
      : null;
    const response = {
      volunteerId,
      lifetime: {
        hours: Number(row?.lifetime_hours ?? 0),
        shifts: Number(row?.lifetime_shifts ?? 0),
      },
      yearToDate: {
        hours: Number(row?.ytd_hours ?? 0),
        shifts: Number(row?.ytd_shifts ?? 0),
      },
      monthToDate: {
        hours: Number(row?.mtd_hours ?? 0),
        shifts: Number(row?.mtd_shifts ?? 0),
      },
      mostBookedRoles: mostRoles,
      lastCompletedShift: lastShift,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching volunteer stats by id:', error);
    next(error);
  }
}

export async function createVolunteer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const {
    firstName,
    lastName,
    email,
    phone,
    roleIds,
    onlineAccess,
    password,
    sendPasswordLink,
  } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    roleIds?: number[];
    onlineAccess?: boolean;
    password?: string;
    sendPasswordLink?: boolean;
  };

  const normalizedEmail = normalizeEmail(email);

  if (
    !firstName ||
    !lastName ||
    !Array.isArray(roleIds) ||
    roleIds.length === 0 ||
    roleIds.some(r => typeof r !== 'number')
  ) {
    return res.status(400).json({
      message: 'First name, last name, and roles required',
    });
  }

  if (onlineAccess && !normalizedEmail) {
    return res
      .status(400)
      .json({ message: 'Email required for online account' });
  }

  try {
    if (normalizedEmail) {
      const emailCheck = await pool.query(
        'SELECT id FROM volunteers WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail],
      );
      if ((emailCheck.rowCount ?? 0) > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const validRoles = await pool.query<{ id: number }>(
      `SELECT id FROM volunteer_roles WHERE id = ANY($1::int[])`,
      [roleIds]
    );
    const validRoleIds = new Set(validRoles.rows.map(r => r.id));
    const invalidIds = roleIds.filter(id => !validRoleIds.has(id));
    if (invalidIds.length) {
      return res.status(400).json({ message: 'Invalid roleIds', invalidIds });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const result = await pool.query(
      `INSERT INTO volunteers (first_name, last_name, email, phone, password, consent)
       VALUES ($1,$2,$3,$4,$5, true)
       RETURNING id`,
      [firstName, lastName, normalizedEmail ?? null, phone ?? null, hashedPassword]
    );
    const volunteerId = result.rows[0].id;
    await pool.query(
      `INSERT INTO volunteer_trained_roles (volunteer_id, role_id, category_id)
       SELECT $1, vr.id, vr.category_id FROM volunteer_roles vr WHERE vr.id = ANY($2::int[])`,
      [volunteerId, roleIds]
    );
    if (sendPasswordLink && normalizedEmail) {
      const token = await generatePasswordSetupToken('volunteers', volunteerId);
      const params = buildPasswordSetupEmailParams('volunteers', token);
      await sendTemplatedEmail({
        to: normalizedEmail,
        templateId: config.passwordSetupTemplateId,
        params,
      });
    }
    res.status(201).json({ id: volunteerId });
  } catch (error) {
    logger.error('Error creating volunteer:', error);
    next(error);
  }
}

export async function updateVolunteer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user || req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const { id } = req.params;
  const {
    firstName,
    lastName,
    email,
    phone,
    onlineAccess,
    password,
    sendPasswordLink,
  } = req.body as {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    onlineAccess?: boolean;
    password?: string;
    sendPasswordLink?: boolean;
  };
  try {
    const normalizedEmail = normalizeEmail(email);

    if (normalizedEmail) {
      const emailCheck = await pool.query(
        'SELECT id FROM volunteers WHERE LOWER(email) = LOWER($1) AND id <> $2',
        [normalizedEmail, id],
      );
      if ((emailCheck.rowCount ?? 0) > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const existing = await pool.query('SELECT password FROM volunteers WHERE id = $1', [id]);
    if ((existing.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    const hadPassword = !!existing.rows[0].password;

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const result = await pool.query(
      `UPDATE volunteers
       SET first_name = $1, last_name = $2, email = $3, phone = $4,
           password = CASE
             WHEN $6::text IS NOT NULL THEN $6::text
             WHEN $5::boolean = false THEN NULL
             ELSE password
           END
       WHERE id = $7
       RETURNING id, first_name, last_name, email, phone, password, consent`,
      [
        firstName,
        lastName,
        normalizedEmail ?? null,
        phone ?? null,
        onlineAccess,
        hashedPassword,
        id,
      ],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    const row = result.rows[0];

    if (sendPasswordLink && normalizedEmail && onlineAccess && !hadPassword) {
      const token = await generatePasswordSetupToken('volunteers', Number(id));
      const params = buildPasswordSetupEmailParams('volunteers', token);
      await sendTemplatedEmail({
        to: normalizedEmail,
        templateId: config.passwordSetupTemplateId,
        params,
      });
    }

    res.json({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      consent: row.consent,
    });
  } catch (error) {
    logger.error('Error updating volunteer:', error);
    next(error);
  }
}

export async function createVolunteerShopperProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const { clientId } = req.body as {
    clientId?: number;
  };
  try {
    const volRes = await pool.query(
      `SELECT first_name, last_name, email, phone, user_id FROM volunteers WHERE id = $1`,
      [id],
    );
    if ((volRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    if (volRes.rows[0].user_id) {
      return res.status(409).json({ message: 'Shopper profile already exists' });
    }
    const email = volRes.rows[0].email;
    if (email) {
      const emailCheck = await pool.query(
        `SELECT client_id FROM clients WHERE LOWER(email) = LOWER($1)`,
        [email],
      );
      if (emailCheck.rowCount) {
        const existingId = emailCheck.rows[0].client_id;
        await pool.query(`UPDATE volunteers SET user_id = $1 WHERE id = $2`, [
          existingId,
          id,
        ]);
        return res.status(200).json({ userId: existingId });
      }
    }
    if (!clientId) {
      return res.status(400).json({ message: 'Client ID required' });
    }
    const clientCheck = await pool.query(
      `SELECT client_id FROM clients WHERE client_id = $1`,
      [clientId],
    );
    if ((clientCheck.rowCount ?? 0) > 0) {
      await pool.query(`UPDATE volunteers SET user_id = $1 WHERE id = $2`, [
        clientId,
        id,
      ]);
      return res.status(200).json({ userId: Number(clientId) });
    }
    const profileLink = `https://portal.link2feed.ca/org/1605/intake/${clientId}`;
    const userRes = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, client_id, role, password, online_access, profile_link, consent)
       VALUES ($1,$2,$3,$4,$5,'shopper',NULL, true, $6, true) RETURNING client_id`,
      [
        volRes.rows[0].first_name,
        volRes.rows[0].last_name,
        volRes.rows[0].email,
        volRes.rows[0].phone,
        clientId,
        profileLink,
      ],
    );
    const userId = userRes.rows[0].client_id;
    await pool.query(`UPDATE volunteers SET user_id = $1 WHERE id = $2`, [
      userId,
      id,
    ]);
    const token = await generatePasswordSetupToken('clients', clientId);
    if (volRes.rows[0].email) {
      const params = buildPasswordSetupEmailParams('clients', token, clientId);
      await sendTemplatedEmail({
        to: volRes.rows[0].email,
        templateId: config.passwordSetupTemplateId,
        params,
      });
    }
    res.status(201).json({ userId });
  } catch (error) {
    logger.error('Error creating volunteer shopper profile:', error);
    next(error);
  }
}

export async function removeVolunteerShopperProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  try {
    const volRes = await pool.query(
      `SELECT user_id FROM volunteers WHERE id = $1`,
      [id],
    );
    if ((volRes.rowCount ?? 0) === 0 || !volRes.rows[0].user_id) {
      return res.status(404).json({ message: 'Shopper profile not found' });
    }
    const userId = volRes.rows[0].user_id;
    const clientRes = await pool.query(
      `SELECT profile_link FROM clients WHERE client_id = $1`,
      [userId],
    );
    const profileLink = clientRes.rows[0]?.profile_link;
    const expectedLink = `https://portal.link2feed.ca/org/1605/intake/${userId}`;
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query(`UPDATE volunteers SET user_id = NULL WHERE id = $1`, [id]);
      if (profileLink === expectedLink) {
        await client.query(`DELETE FROM clients WHERE client_id = $1`, [userId]);
      }
      await client.query('COMMIT');
    } catch (transactionError) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error('Error rolling back volunteer shopper removal:', rollbackError);
        }
      }
      throw transactionError;
    } finally {
      client?.release();
    }
    res.json({ message: 'Shopper profile removed' });
  } catch (error) {
    logger.error('Error removing volunteer shopper profile:', error);
    next(error);
  }
}

export async function searchVolunteers(req: Request, res: Response, next: NextFunction) {
  try {
    const rawSearch = (req.query.search as string) || '';
    const search = rawSearch.trim();

    if (search.length < 3) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT v.id, v.first_name, v.last_name, v.email, v.phone, v.user_id, v.password,
              ARRAY_REMOVE(ARRAY_AGG(vtr.role_id), NULL) AS role_ids
       FROM volunteers v
       LEFT JOIN volunteer_trained_roles vtr ON v.id = vtr.volunteer_id
       WHERE (v.first_name || ' ' || v.last_name) ILIKE $1
          OR v.email ILIKE $1
          OR v.phone ILIKE $1
       GROUP BY v.id
       ORDER BY v.first_name, v.last_name
       LIMIT 5`,
      [`%${search}%`]
    );

    const formatted = result.rows.map(v => ({
      id: v.id,
      name: `${v.first_name} ${v.last_name}`.trim(),
      firstName: v.first_name,
      lastName: v.last_name,
      email: v.email,
      phone: v.phone,
      trainedAreas: (v.role_ids || []).map(Number),
      hasShopper: Boolean(v.user_id),
      hasPassword: v.password != null,
      clientId: v.user_id ? Number(v.user_id) : null,
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error searching volunteers:', error);
    next(error);
  }
}

export async function getVolunteerStats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const manualRes = await pool.query<{ badge_code: string }>(
      `SELECT badge_code FROM volunteer_badges WHERE volunteer_id = $1`,
      [user.id],
    );
    const badges = new Set(manualRes.rows.map(r => r.badge_code));

    // Determine whether this volunteer qualifies for the early-bird badge.
    // The query returns a single boolean column aliased as `early`,
    // so type the result accordingly.
    const earlyRes = await pool.query<{ early: boolean }>(
      `SELECT has_early_bird OR EXISTS (
         SELECT 1 FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         WHERE vb.volunteer_id = $1 AND vb.status = 'completed' AND vs.start_time < '09:00:00'
       ) AS early
       FROM volunteers WHERE id = $1`,
      [user.id],
    );
    if (earlyRes.rows[0]?.early) badges.add('early-bird');

    const statsRes = await pool.query<{
      lifetime_hours: string;
      month_hours: string;
      total_shifts: string;
    }>(
      `WITH bounds AS (
         SELECT timezone('Canada/Saskatchewan', now())::date AS today,
                date_trunc('month', timezone('Canada/Saskatchewan', now()))::date AS month_start,
                (date_trunc('month', timezone('Canada/Saskatchewan', now()))::date + INTERVAL '1 month')::date AS month_end
       )
       SELECT
         v.archived_hours + COALESCE(SUM(EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600), 0) AS lifetime_hours,
         COALESCE(SUM(EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600)
           FILTER (WHERE vb.date >= bounds.month_start AND vb.date < bounds.month_end), 0) AS month_hours,
         v.archived_shifts + COUNT(vb.*) AS total_shifts
       FROM volunteers v
       CROSS JOIN bounds
       LEFT JOIN volunteer_bookings vb ON vb.volunteer_id = v.id AND vb.status = 'completed' AND vb.date <= bounds.today
       LEFT JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       WHERE v.id = $1
       GROUP BY v.archived_hours, v.archived_shifts`,
      [user.id],
    );
    const statsRow = statsRes.rows[0];
    const lifetimeHours = Number(statsRow?.lifetime_hours ?? 0);
    const monthHours = Number(statsRow?.month_hours ?? 0);
    const totalShifts = Number(statsRow?.total_shifts ?? 0);

    const heavyRes = await pool.query<{ count: string }>(
      `SELECT v.archived_shifts + COUNT(vb.*) AS count
       FROM volunteers v
       LEFT JOIN volunteer_bookings vb ON vb.volunteer_id = v.id AND vb.status = 'completed'
       WHERE v.id = $1
       GROUP BY v.archived_shifts`,
      [user.id],
    );
    if (Number(heavyRes.rows[0]?.count ?? 0) >= 10) badges.add('heavy-lifter');

    const weeksRes = await pool.query<{ week_start: string }>(
      `SELECT DISTINCT date_trunc('week', date) AS week_start
       FROM volunteer_bookings
       WHERE volunteer_id = $1 AND status = 'completed' AND date <= CURRENT_DATE
       ORDER BY week_start DESC`,
      [user.id],
    );

    const weekStarts = weeksRes.rows.map(w => new Date(w.week_start).toISOString().slice(0, 10));
    const weekSet = new Set(weekStarts);

    const startOfWeek = (d: Date) => {
      const date = new Date(reginaStartOfDayISO(d));
      const day = date.getUTCDay();
      const diff = (day + 6) % 7;
      date.setUTCDate(date.getUTCDate() - diff);
      return date.toISOString().slice(0, 10);
    };

    const today = new Date(reginaStartOfDayISO(new Date()));
    let current = startOfWeek(today);
    let streak = 0;
    while (weekSet.has(current)) {
      streak++;
      const d = new Date(current);
      d.setUTCDate(d.getUTCDate() - 7);
      current = d.toISOString().slice(0, 10);
    }

    const milestone = [25, 10, 5].find(m => m === totalShifts) ?? null;

    const contribRes = await pool.query<{
      families_served: string;
      pounds_handled: string;
      month_families_served: string;
      month_pounds_handled: string;
    }>(
      `WITH bounds AS (
         SELECT date_trunc('month', timezone('Canada/Saskatchewan', now()))::date AS month_start,
                (date_trunc('month', timezone('Canada/Saskatchewan', now()))::date + INTERVAL '1 month')::date AS month_end
       )
       SELECT COUNT(*) AS families_served,
              COALESCE(SUM(COALESCE(weight_without_cart, weight_with_cart - cart_tare)), 0) AS pounds_handled,
              COUNT(DISTINCT client_id) FILTER (
                WHERE date >= bounds.month_start AND date < bounds.month_end
              ) AS month_families_served,
              COALESCE(SUM(COALESCE(weight_without_cart, weight_with_cart - cart_tare)) FILTER (
                WHERE date >= bounds.month_start AND date < bounds.month_end
              ), 0) AS month_pounds_handled
         FROM client_visits
         CROSS JOIN (
           SELECT COALESCE(value::numeric, 0) AS cart_tare
           FROM app_config
           WHERE key = 'cart_tare'
         ) c
         CROSS JOIN bounds`,
    );
    const familiesServed = Number(contribRes.rows[0]?.families_served ?? 0);
    const poundsHandled = Number(contribRes.rows[0]?.pounds_handled ?? 0);
    const monthFamiliesServed = Number(
      contribRes.rows[0]?.month_families_served ?? 0,
    );
    const monthPoundsHandled = Number(
      contribRes.rows[0]?.month_pounds_handled ?? 0,
    );
    const milestoneText = milestone
      ? `Congratulations on completing ${milestone} shifts!`
      : null;

    res.json({
      badges: Array.from(badges),
      lifetimeHours,
      monthHours,
      totalShifts,
      currentStreak: streak,
      milestone,
      milestoneText,
      familiesServed,
      poundsHandled,
      monthFamiliesServed,
      monthPoundsHandled,
    });
  } catch (error) {
    logger.error('Error fetching volunteer stats:', error);
    next(error);
  }
}

export async function awardVolunteerBadge(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  const { badgeCode } = req.body as { badgeCode?: string };
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!badgeCode) {
    return res.status(400).json({ message: 'badgeCode is required' });
  }
  try {
    await pool.query(
      `INSERT INTO volunteer_badges (volunteer_id, badge_code)
       VALUES ($1, $2)
       ON CONFLICT (volunteer_id, badge_code) DO NOTHING`,
      [user.id, badgeCode],
    );
    res.status(201).json({ badgeCode });
  } catch (error) {
    logger.error('Error awarding volunteer badge:', error);
    next(error);
  }
}

export async function removeVolunteerBadge(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  const { badgeCode } = req.params as { badgeCode?: string };
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!badgeCode) {
    return res.status(400).json({ message: 'badgeCode is required' });
  }
  try {
    const result = await pool.query(
      'DELETE FROM volunteer_badges WHERE volunteer_id = $1 AND badge_code = $2',
      [user.id, badgeCode],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    res.json({ badgeCode });
  } catch (error) {
    logger.error('Error removing volunteer badge:', error);
    next(error);
  }
}

export async function deleteVolunteer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user || req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM volunteers WHERE id = $1', [
      id,
    ]);
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    res.json({ message: 'Volunteer deleted' });
  } catch (error) {
    logger.error('Error deleting volunteer:', error);
    next(error);
  }
}
