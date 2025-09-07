import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger';
import issueAuthTokens, { AuthPayload } from '../../utils/authUtils';
import config from '../../config';
import { generatePasswordSetupToken } from '../../utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../../utils/emailUtils';

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

export async function loginVolunteer(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  try {
    const result = await pool.query(
        `SELECT v.id, v.first_name, v.last_name, v.password, v.user_id, u.role AS user_role
         FROM volunteers v
         LEFT JOIN clients u ON v.user_id = u.client_id
         WHERE v.email = $1`,
      [email]
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const volunteer = result.rows[0];
    if (!volunteer.password) {
      return res.status(403).json({ message: 'Password setup link expired' });
    }
    const match = await bcrypt.compare(password, volunteer.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const rolesRes = await pool.query(
      `SELECT vr.name
         FROM volunteer_trained_roles vtr
         JOIN volunteer_roles vr ON vtr.role_id = vr.id
         WHERE vtr.volunteer_id = $1`,
      [volunteer.id],
    );
    const access: string[] = [];
    if (rolesRes.rows.some(r => r.name === 'Donation Entry')) {
      access.push('donation_entry');
    }
    const payload: AuthPayload = {
      id: volunteer.id,
      role: 'volunteer',
      type: 'volunteer',
      ...(access.length && { access }),
      ...(volunteer.user_id && {
        userId: volunteer.user_id,
        userRole: volunteer.user_role || 'shopper',
      }),
    };
    const tokens = await issueAuthTokens(
      res,
      payload,
      `volunteer:${volunteer.id}`,
    );
    res.json({
      role: 'volunteer',
      name: `${volunteer.first_name} ${volunteer.last_name}`,
      ...(volunteer.user_id && {
        userId: volunteer.user_id,
        userRole: volunteer.user_role || 'shopper',
      }),
      access,
      ...tokens,
    });
  } catch (error) {
    logger.error('Error logging in volunteer:', error);
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
      `SELECT id, first_name, last_name, email, phone FROM volunteers WHERE id = $1`,
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
    });
  } catch (error) {
    logger.error('Error fetching volunteer profile:', error);
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
  } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    roleIds?: number[];
    onlineAccess?: boolean;
  };

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

  if (onlineAccess && !email) {
    return res
      .status(400)
      .json({ message: 'Email required for online account' });
  }

  try {
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM volunteers WHERE email=$1', [
        email,
      ]);
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

    const result = await pool.query(
      `INSERT INTO volunteers (first_name, last_name, email, phone, password)
       VALUES ($1,$2,$3,$4,NULL)
       RETURNING id`,
      [firstName, lastName, email, phone]
    );
    const volunteerId = result.rows[0].id;
    await pool.query(
      `INSERT INTO volunteer_trained_roles (volunteer_id, role_id, category_id)
       SELECT $1, vr.id, vr.category_id FROM volunteer_roles vr WHERE vr.id = ANY($2::int[])`,
      [volunteerId, roleIds]
    );
    if (email) {
      const token = await generatePasswordSetupToken('volunteers', volunteerId);
      await sendTemplatedEmail({
        to: email,
        templateId: config.passwordSetupTemplateId,
        params: {
          link: `${config.frontendOrigins[0]}/set-password?token=${token}`,
          token,
        },
      });
    }
    res.status(201).json({ id: volunteerId });
  } catch (error) {
    logger.error('Error creating volunteer:', error);
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
        `SELECT client_id FROM clients WHERE email = $1`,
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
      return res.status(400).json({ message: 'Client ID already exists' });
    }
    const profileLink = `https://portal.link2feed.ca/org/1605/intake/${clientId}`;
    const userRes = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, client_id, role, password, online_access, profile_link)
       VALUES ($1,$2,$3,$4,$5,'shopper',NULL, true, $6) RETURNING client_id`,
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
      await sendTemplatedEmail({
        to: volRes.rows[0].email,
        templateId: config.passwordSetupTemplateId,
        params: {
          link: `${config.frontendOrigins[0]}/set-password?token=${token}`,
          token,
        },
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
    if (profileLink === expectedLink) {
      await pool.query(`DELETE FROM clients WHERE client_id = $1`, [userId]);
    }
    await pool.query(`UPDATE volunteers SET user_id = NULL WHERE id = $1`, [id]);
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
      `SELECT v.id, v.first_name, v.last_name, v.user_id,
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
      trainedAreas: (v.role_ids || []).map(Number),
      hasShopper: Boolean(v.user_id),
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

    const earlyRes = await pool.query(
      `SELECT 1 FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       WHERE vb.volunteer_id = $1 AND vb.status = 'completed' AND vs.start_time < '09:00:00'
       LIMIT 1`,
      [user.id],
    );
    if (earlyRes.rowCount) badges.add('early-bird');

    const statsRes = await pool.query<{
      lifetime_hours: string;
      month_hours: string;
      total_shifts: string;
    }>(
      `SELECT
         COALESCE(SUM(EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600), 0) AS lifetime_hours,
         COALESCE(SUM(
           CASE
             WHEN date_trunc('month', vb.date) = date_trunc('month', CURRENT_DATE)
             THEN EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600
             ELSE 0
           END
       ), 0) AS month_hours,
        COUNT(*) AS total_shifts
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       WHERE vb.volunteer_id = $1 AND vb.status = 'completed' AND vb.date <= CURRENT_DATE`,
      [user.id],
    );
    const statsRow = statsRes.rows[0];
    const lifetimeHours = Number(statsRow?.lifetime_hours ?? 0);
    const monthHours = Number(statsRow?.month_hours ?? 0);
    const totalShifts = Number(statsRow?.total_shifts ?? 0);

    const heavyRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE volunteer_id = $1 AND status = 'completed'`,
      [user.id],
    );
    if (Number(heavyRes.rows[0].count) >= 10) badges.add('heavy-lifter');

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
      const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const day = date.getUTCDay();
      const diff = (day + 6) % 7;
      date.setUTCDate(date.getUTCDate() - diff);
      return date.toISOString().slice(0, 10);
    };

    let current = startOfWeek(new Date());
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
      `SELECT COUNT(*) AS families_served,
              COALESCE(SUM(weight_with_cart - weight_without_cart), 0) AS pounds_handled,
              COUNT(DISTINCT client_id) FILTER (
                WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
              ) AS month_families_served,
              COALESCE(SUM(weight_with_cart - weight_without_cart) FILTER (
                WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
              ), 0) AS month_pounds_handled
         FROM client_visits`,
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
