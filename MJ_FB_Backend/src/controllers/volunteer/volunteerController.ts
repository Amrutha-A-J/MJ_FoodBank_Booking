import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger';
import { validatePassword } from '../../utils/passwordUtils';
import issueAuthTokens, { AuthPayload } from '../../utils/authUtils';

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
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }
  try {
    const result = await pool.query(
        `SELECT v.id, v.first_name, v.last_name, v.username, v.password, v.user_id, u.role AS user_role
         FROM volunteers v
         LEFT JOIN clients u ON v.user_id = u.client_id
         WHERE v.username = $1`,
      [username]
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const volunteer = result.rows[0];
    const match = await bcrypt.compare(password, volunteer.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const payload: AuthPayload = {
      id: volunteer.id,
      role: 'volunteer',
      type: 'volunteer',
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
      `SELECT id, first_name, last_name, email, phone, username FROM volunteers WHERE id = $1`,
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
      username: row.username,
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
    username,
    password,
    email,
    phone,
    roleIds,
  } = req.body as {
    firstName?: string;
    lastName?: string;
    username?: string;
    password?: string;
    email?: string;
    phone?: string;
    roleIds?: number[];
  };

  if (
    !firstName ||
    !lastName ||
    !username ||
    !password ||
    !Array.isArray(roleIds) ||
    roleIds.length === 0 ||
    roleIds.some(r => typeof r !== 'number')
  ) {
    return res.status(400).json({
      message: 'First name, last name, username, password and roles required',
    });
  }

  const pwError = validatePassword(password);
  if (pwError) {
    return res.status(400).json({ message: pwError });
  }

  try {
    const usernameCheck = await pool.query('SELECT id FROM volunteers WHERE username=$1', [
      username,
    ]);
    if ((usernameCheck.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

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

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO volunteers (first_name, last_name, email, phone, username, password)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [firstName, lastName, email, phone, username, hashed]
    );
    const volunteerId = result.rows[0].id;
    await pool.query(
      `INSERT INTO volunteer_trained_roles (volunteer_id, role_id, category_id)
       SELECT $1, vr.id, vr.category_id FROM volunteer_roles vr WHERE vr.id = ANY($2::int[])`,
      [volunteerId, roleIds]
    );
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
  const { clientId, password } = req.body as {
    clientId?: number;
    password?: string;
  };
  if (!clientId || !password) {
    return res.status(400).json({ message: 'Client ID and password required' });
  }

  const pwError2 = validatePassword(password);
  if (pwError2) {
    return res.status(400).json({ message: pwError2 });
  }
  try {
    const volRes = await pool.query(
      `SELECT first_name, last_name, email, phone FROM volunteers WHERE id = $1`,
      [id],
    );
    if ((volRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    const clientCheck = await pool.query(
      `SELECT client_id FROM clients WHERE client_id = $1`,
      [clientId],
    );
    if ((clientCheck.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Client ID already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const profileLink = `https://portal.link2feed.ca/org/1605/intake/${clientId}`;
    const userRes = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, client_id, role, password, online_access, profile_link)
       VALUES ($1,$2,$3,$4,$5,'shopper',$6, true, $7) RETURNING id`,
      [
        volRes.rows[0].first_name,
        volRes.rows[0].last_name,
        volRes.rows[0].email,
        volRes.rows[0].phone,
        clientId,
        hashed,
        profileLink,
      ],
    );
    const userId = userRes.rows[0].id;
    await pool.query(`UPDATE volunteers SET user_id = $1 WHERE id = $2`, [
      userId,
      id,
    ]);
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
    await pool.query(`DELETE FROM clients WHERE client_id = $1`, [userId]);
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
          OR v.username ILIKE $1
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
       WHERE vb.volunteer_id = $1 AND vb.status = 'approved' AND vs.start_time < '09:00:00'
       LIMIT 1`,
      [user.id],
    );
    if (earlyRes.rowCount) badges.add('early-bird');

    const heavyRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM volunteer_bookings
       WHERE volunteer_id = $1 AND status = 'approved'`,
      [user.id],
    );
    if (Number(heavyRes.rows[0].count) >= 10) badges.add('heavy-lifter');

    const bookingRes = await pool.query<{
      date: string;
      start_time: string;
      end_time: string;
    }>(
      `SELECT vb.date, vs.start_time, vs.end_time
       FROM volunteer_bookings vb
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       WHERE vb.volunteer_id = $1 AND vb.status = 'approved' AND vb.date <= CURRENT_DATE
       ORDER BY vb.date`,
      [user.id],
    );

    let lifetimeHours = 0;
    let monthHours = 0;
    const weekKeys = new Set<string>();
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    for (const row of bookingRes.rows) {
      const [sh, sm, ss] = row.start_time.split(':').map(Number);
      const [eh, em, es] = row.end_time.split(':').map(Number);
      const duration = (eh * 3600 + em * 60 + es - (sh * 3600 + sm * 60 + ss)) / 3600;
      lifetimeHours += duration;
      const date = new Date(`${row.date}T00:00:00Z`);
      if (date >= startOfMonth) monthHours += duration;
      weekKeys.add(startOfWeekKey(date));
    }

    const totalShifts = bookingRes.rowCount;
    let currentStreak = 0;
    let cursor = startOfWeek(new Date());
    while (weekKeys.has(startOfWeekKey(cursor))) {
      currentStreak++;
      cursor.setUTCDate(cursor.getUTCDate() - 7);
    }

    const milestones = [5, 10, 25];
    const milestone = milestones.includes(totalShifts) ? totalShifts : undefined;

    res.json({
      badges: Array.from(badges),
      lifetimeHours,
      monthHours,
      totalShifts,
      currentStreak,
      ...(milestone && { milestone }),
    });
  } catch (error) {
    logger.error('Error fetching volunteer stats:', error);
    next(error);
  }
}

function startOfWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function startOfWeekKey(date: Date) {
  return startOfWeek(date).toISOString().slice(0, 10);
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
