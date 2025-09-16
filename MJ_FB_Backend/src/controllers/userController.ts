import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { UserRole } from '../models/user';
import type { UserPreferences } from '../models/userPreferences';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import issueAuthTokens, { AuthPayload } from '../utils/authUtils';
import { sendTemplatedEmail } from '../utils/emailUtils';
import { generatePasswordSetupToken, buildPasswordSetupEmailParams } from '../utils/passwordSetupUtils';
import config from '../config';
import { getClientBookingsThisMonth } from './clientVisitController';

export async function loginUser(req: Request, res: Response, next: NextFunction) {
  const { email, password, clientId } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password required' });
  }

  try {
    const maintenanceRes = await pool.query(
      "SELECT value FROM app_config WHERE key = 'maintenance_mode'",
    );
    const maintenanceMode = maintenanceRes.rows[0]?.value === 'true';
    if (email) {
      const volunteerQuery = await pool.query(
        `SELECT v.id, v.first_name, v.last_name, v.password, v.consent, v.user_id, u.role AS user_role
         FROM volunteers v
         LEFT JOIN clients u ON v.user_id = u.client_id
         WHERE v.email = $1`,
        [email],
      );
      if ((volunteerQuery.rowCount ?? 0) > 0) {
        const volunteer = volunteerQuery.rows[0];
        if (!volunteer.password) {
          return res.status(410).json({ message: 'Password setup link expired' });
        }
        const match = await bcrypt.compare(password, volunteer.password);
        if (!match) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (maintenanceMode) {
          return res
            .status(503)
            .json({ message: 'Service unavailable due to maintenance' });
        }
        const rolesRes = await pool.query(
          `SELECT vr.name
           FROM volunteer_trained_roles vtr
           JOIN volunteer_roles vr ON vtr.role_id = vr.id
           WHERE vtr.volunteer_id = $1`,
          [volunteer.id],
        );
        const access: string[] = [];
        if (
          rolesRes.rows.some(
            r => r.name && r.name.toLowerCase() === 'donation entry',
          )
        ) {
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
        await issueAuthTokens(res, payload, `volunteer:${volunteer.id}`);
        return res.json({
          role: 'volunteer',
          name: `${volunteer.first_name} ${volunteer.last_name}`,
          ...(volunteer.user_id && {
            userRole: volunteer.user_role || 'shopper',
          }),
          access,
          id: volunteer.id,
          consent: volunteer.consent,
        });
      }

      const staffQuery = await pool.query(
        `SELECT id, first_name, last_name, email, password, role, access, consent FROM staff WHERE email = $1`,
        [email],
      );
      if ((staffQuery.rowCount ?? 0) > 0) {
        const staff = staffQuery.rows[0];
        if (!staff.password) {
          return res
            .status(410)
            .json({ message: 'Password setup link expired' });
        }
        const match = await bcrypt.compare(password, staff.password);
        if (!match) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
        const role = 'staff';
        const payload: AuthPayload = {
          id: staff.id,
          role,
          type: 'staff',
          access: staff.access || [],
        };
        await issueAuthTokens(res, payload, `staff:${staff.id}`);
        return res.json({
          role,
          name: `${staff.first_name} ${staff.last_name}`,
          access: staff.access || [],
          id: staff.id,
          consent: staff.consent,
        });
      }

      const clientEmailQuery = await pool.query(
        `SELECT client_id, first_name, last_name, role, password FROM clients WHERE email = $1 AND online_access = true`,
        [email],
      );
      if ((clientEmailQuery.rowCount ?? 0) > 0) {
        const userRow = clientEmailQuery.rows[0];
        if (!userRow.password) {
          return res.status(410).json({ message: 'Password setup link expired' });
        }
        const match = await bcrypt.compare(password, userRow.password);
        if (!match) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (maintenanceMode) {
          return res
            .status(503)
            .json({ message: 'Service unavailable due to maintenance' });
        }
        const payload: AuthPayload = {
          id: userRow.client_id,
          role: userRow.role,
          type: 'user',
        };
        await issueAuthTokens(res, payload, `user:${userRow.client_id}`);
        return res.json({
          role: userRow.role,
          name: `${userRow.first_name} ${userRow.last_name}`,
          id: userRow.client_id,
        });
      }

      return res.status(404).json({ message: 'Account not found' });
    }

    if (clientId) {
      const userQuery = await pool.query(
        `SELECT client_id, first_name, last_name, role, password, consent FROM clients WHERE client_id = $1 AND online_access = true`,
        [clientId],
      );
      if ((userQuery.rowCount ?? 0) === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const userRow = userQuery.rows[0];
      if (!userRow.password) {
        return res.status(410).json({ message: 'Password setup link expired' });
      }
      const match = await bcrypt.compare(password, userRow.password);
      if (!match) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (maintenanceMode) {
        return res
          .status(503)
          .json({ message: 'Service unavailable due to maintenance' });
      }

      const volunteerQuery = await pool.query(
        `SELECT id, first_name, last_name, consent FROM volunteers WHERE user_id = $1`,
        [userRow.client_id],
      );
      if ((volunteerQuery.rowCount ?? 0) > 0) {
        const volunteer = volunteerQuery.rows[0];
        const rolesRes = await pool.query(
          `SELECT vr.name
           FROM volunteer_trained_roles vtr
           JOIN volunteer_roles vr ON vtr.role_id = vr.id
           WHERE vtr.volunteer_id = $1`,
          [volunteer.id],
        );
        const access: string[] = [];
        if (
          rolesRes.rows.some(
            r => r.name && r.name.toLowerCase() === 'donation entry',
          )
        ) {
          access.push('donation_entry');
        }
        const payload: AuthPayload = {
          id: volunteer.id,
          role: 'volunteer',
          type: 'volunteer',
          ...(access.length && { access }),
          userId: userRow.client_id,
          userRole: userRow.role,
        };
        await issueAuthTokens(res, payload, `volunteer:${volunteer.id}`);
        return res.json({
          role: 'volunteer',
          name: `${volunteer.first_name} ${volunteer.last_name}`,
          userRole: userRow.role,
          access,
          id: volunteer.id,
          consent: volunteer.consent,
        });
      }

      const payload: AuthPayload = {
        id: userRow.client_id,
        role: userRow.role,
        type: 'user',
      };
      await issueAuthTokens(res, payload, `user:${userRow.client_id}`);
      return res.json({
        role: userRow.role,
        name: `${userRow.first_name} ${userRow.last_name}`,
        id: userRow.client_id,
        consent: userRow.consent,
      });
    }

    return res.status(400).json({ message: 'Email or clientId required' });
  } catch (error) {
    logger.error('Error logging in:', error);
    next(error);
  }
}


export async function createUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    address,
    clientId,
    role,
    onlineAccess,
    password,
    sendPasswordLink,
  } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    clientId: number;
    role: UserRole;
    onlineAccess: boolean;
    password?: string;
    sendPasswordLink?: boolean;
  };

  if (!clientId || !role) {
    return res.status(400).json({ message: 'Client ID and role required' });
  }

  if (onlineAccess && (!firstName || !lastName || !email)) {
    return res.status(400).json({ message: 'Missing fields for online account' });
  }

  if (!['shopper', 'delivery'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  if (clientId < 1 || clientId > 9999999) {
    return res
      .status(400)
      .json({ message: 'Client ID must be between 1 and 9,999,999' });
  }

  try {
    const check = await pool.query('SELECT client_id FROM clients WHERE client_id = $1', [clientId]);
    if ((check.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Client ID already exists' });
    }

    if (email) {
      const emailCheck = await pool.query('SELECT client_id FROM clients WHERE email = $1', [email]);
      if ((emailCheck.rowCount ?? 0) > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const profileLink = `https://portal.link2feed.ca/org/1605/intake/${clientId}`;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, address, client_id, role, password, online_access, profile_link, consent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)`,
      [
        firstName || null,
        lastName || null,
        email || null,
        phone || null,
        address || null,
        clientId,
        role,
        hashedPassword,
        onlineAccess,
        profileLink,
      ],
    );

    if (sendPasswordLink && email) {
      const token = await generatePasswordSetupToken('clients', clientId);
      const params = buildPasswordSetupEmailParams('clients', token, clientId);
      await sendTemplatedEmail({
        to: email,
        templateId: config.passwordSetupTemplateId,
        params,
      });
    }

    res.status(201).json({ message: 'User created' });
  } catch (error) {
    logger.error('Error creating user:', error);
    next(error);
  }
}

export async function searchUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const rawSearch = (req.query.search as string) || '';
    const search = rawSearch.trim();

    if (search.length < 3) {
      return res.json([]); // short input: skip query
    }

    const searchPattern = `%${search.replace(/\s+/g, '%')}%`;

    const usersResult = await pool.query(
      `SELECT client_id, first_name, last_name, email, phone, password
       FROM clients
       WHERE (first_name || ' ' || last_name) ILIKE $1
          OR email ILIKE $1
          OR phone ILIKE $1
          OR CAST(client_id AS TEXT) ILIKE $1
       ORDER BY first_name, last_name ASC
       LIMIT 5`,
      [searchPattern]
    );

    const formatted = usersResult.rows.map(u => ({
      name: `${u.first_name} ${u.last_name}`.trim(),
      email: u.email,
      phone: u.phone,
      client_id: u.client_id,
      hasPassword: u.password != null,
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error searching users:', error);
    next(error);
  }
}

export async function getUserByClientId(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT client_id, first_name, last_name, email, phone, address, online_access, password, consent
       FROM clients WHERE client_id = $1`,
      [clientId]
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const row = result.rows[0];
    res.json({
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      clientId: row.client_id,
      onlineAccess: row.online_access,
      hasPassword: row.password != null,
      consent: row.consent,
    });
  } catch (error) {
    logger.error('Error fetching user by client ID:', error);
    next(error);
  }
}

export async function getUserProfile(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    if (user.type === 'staff') {
      const result = await pool.query(
        `SELECT id, first_name, last_name, email, access, consent FROM staff WHERE id = $1`,
        [user.id],
      );
      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const row = result.rows[0];
      return res.json({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: null,
        address: null,
        role: 'staff',
        roles: row.access || [],
        consent: row.consent,
      });
    }

    if (user.type === 'volunteer') {
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
        address: null,
        role: 'volunteer',
        trainedAreas: trainedRes.rows.map(r => r.name),
        consent: row.consent,
      });
    }

    const result = await pool.query(
      `SELECT client_id, first_name, last_name, email, phone, address, role, consent
       FROM clients WHERE client_id = $1`,
      [user.id],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const row = result.rows[0];
    const bookingsThisMonth = await getClientBookingsThisMonth(Number(user.id));
    return res.json({
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      clientId: row.client_id,
      role: row.role,
      bookingsThisMonth,
      consent: row.consent,
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    next(error);
  }
}

export async function updateMyProfile(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { email, phone, address } = req.body as {
    email?: string;
    phone?: string;
    address?: string;
  };
  try {
    if (user.type === 'staff') {
      const result = await pool.query(
        `UPDATE staff SET email = COALESCE($1, email)
         WHERE id = $2
         RETURNING id, first_name, last_name, email, access, consent`,
        [email, user.id],
      );
      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const row = result.rows[0];
      return res.json({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: null,
        address: null,
        role: 'staff',
        roles: row.access || [],
        consent: row.consent,
      });
    }

    if (user.type === 'volunteer') {
      const result = await pool.query(
        `UPDATE volunteers
         SET email = COALESCE($1, email),
             phone = COALESCE($2, phone)
         WHERE id = $3
         RETURNING id, first_name, last_name, email, phone, consent`,
        [email, phone, user.id],
      );
      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const trainedRes = await pool.query(
        `SELECT vr.name
         FROM volunteer_trained_roles vtr
         JOIN volunteer_roles vr ON vtr.role_id = vr.id
         WHERE vtr.volunteer_id = $1`,
        [user.id],
      );
      const row = result.rows[0];
      return res.json({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        address: null,
        role: 'volunteer',
        trainedAreas: trainedRes.rows.map(r => r.name),
        consent: row.consent,
      });
    }

    const result = await pool.query(
      `UPDATE clients
       SET email = COALESCE($1, email),
           phone = COALESCE($2, phone),
           address = COALESCE($3, address)
       WHERE client_id = $4
       RETURNING client_id, first_name, last_name, email, phone, address, role, consent`,
      [email, phone, address, user.id],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const row = result.rows[0];
    const bookingsThisMonth = await getClientBookingsThisMonth(Number(user.id));
    return res.json({
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      clientId: row.client_id,
      role: row.role,
      bookingsThisMonth,
      consent: row.consent,
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    next(error);
  }
}

export async function listUsersMissingInfo(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query(
      `SELECT client_id, first_name, last_name, email, phone, profile_link
       FROM clients
       WHERE first_name IS NULL AND last_name IS NULL
       ORDER BY client_id ASC`,
    );
    const users = result.rows.map(row => ({
      clientId: row.client_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      profileLink: row.profile_link,
    }));
    res.json(users);
  } catch (error) {
    logger.error('Error listing users missing info:', error);
    next(error);
  }
}

export async function updateUserByClientId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user || req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const { clientId } = req.params;
  const { firstName, lastName, email, phone, address, onlineAccess, password } =
    req.body as {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      address?: string;
      onlineAccess?: boolean;
      password?: string;
    };
  try {
    if (onlineAccess) {
      if (!firstName || !lastName) {
        return res
          .status(400)
          .json({ message: 'Missing fields for online access' });
      }

      if (email) {
        const emailCheck = await pool.query(
          'SELECT client_id FROM clients WHERE email = $1 AND client_id <> $2',
          [email, clientId],
        );
        if ((emailCheck.rowCount ?? 0) > 0) {
          return res.status(400).json({ message: 'Email already exists' });
        }
      }

      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
      const result = await pool.query(
        `UPDATE clients
         SET first_name = $1, last_name = $2, email = $3, phone = $4,
             address = $5, online_access = true, password = COALESCE($6, password)
         WHERE client_id = $7
         RETURNING client_id, first_name, last_name, email, phone, address, profile_link, consent`,
        [
          firstName,
          lastName,
          email || null,
          phone || null,
          address || null,
          hashedPassword,
          clientId,
        ],
      );
      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const row = result.rows[0];
      return res.json({
        clientId: row.client_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        profileLink: row.profile_link,
        consent: row.consent,
      });
    }

    const result = await pool.query(
      `UPDATE clients
       SET first_name = $1, last_name = $2, email = $3, phone = $4, address = $5
       WHERE client_id = $6
       RETURNING client_id, first_name, last_name, email, phone, address, profile_link, consent`,
      [firstName, lastName, email || null, phone || null, address || null, clientId],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const row = result.rows[0];
    res.json({
      clientId: row.client_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      profileLink: row.profile_link,
      consent: row.consent,
    });
  } catch (error) {
    logger.error('Error updating user info:', error);
    next(error);
  }
}

export async function deleteUserByClientId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user || req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const { clientId } = req.params;
  try {
    const result = await pool.query('DELETE FROM clients WHERE client_id = $1', [
      clientId,
    ]);
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === '23503') {
      logger.warn('Cannot delete user with existing references:', error);
      return res
        .status(409)
        .json({ message: 'Cannot delete user with existing records' });
    }
    logger.error('Error deleting user:', error);
    next(error);
  }
}


export async function getMyPreferences(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (user.type !== 'user' && user.type !== 'volunteer') {
    return res.status(403).json({ message: 'Unsupported user type' });
  }
  try {
    const result = await pool.query(
      `SELECT email_reminders FROM user_preferences WHERE user_id = $1 AND user_type = $2`,
      [user.id, user.type],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.json({ emailReminders: true });
    }
    const row = result.rows[0];
    res.json({
      emailReminders: row.email_reminders,
    });
  } catch (error) {
    logger.error('Error fetching user preferences:', error);
    next(error);
  }
}

export async function updateMyPreferences(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (user.type !== 'user' && user.type !== 'volunteer') {
    return res.status(403).json({ message: 'Unsupported user type' });
  }
  const { emailReminders } = req.body as UserPreferences;
  try {
    const result = await pool.query(
      `INSERT INTO user_preferences (user_id, user_type, email_reminders)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, user_type)
       DO UPDATE SET email_reminders = EXCLUDED.email_reminders
       RETURNING email_reminders`,
      [user.id, user.type, emailReminders],
    );
    const row = result.rows[0];
    res.json({
      emailReminders: row.email_reminders,
    });
  } catch (error) {
    logger.error('Error updating user preferences:', error);
    next(error);
  }
}

