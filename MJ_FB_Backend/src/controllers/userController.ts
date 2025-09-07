import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { UserRole } from '../models/user';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import issueAuthTokens, { AuthPayload } from '../utils/authUtils';
import { getAgencyByEmail } from '../models/agency';
import { sendTemplatedEmail } from '../utils/emailUtils';
import { generatePasswordSetupToken } from '../utils/passwordSetupUtils';
import config from '../config';
import { getClientBookingsThisMonth } from './clientVisitController';

export async function loginUser(req: Request, res: Response, next: NextFunction) {
  const { email, password, clientId } = req.body;

  try {
    if (clientId) {
      if (!password) {
        return res
          .status(400)
          .json({ message: 'Client ID and password required' });
      }
      const userQuery = await pool.query(
        `SELECT client_id, first_name, last_name, role, password FROM clients WHERE client_id = $1 AND online_access = true`,
        [clientId]
      );
      if ((userQuery.rowCount ?? 0) === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const userRow = userQuery.rows[0];
      if (!userRow.password) {
        return res.status(403).json({ message: 'Password setup link expired' });
      }
      const match = await bcrypt.compare(password, userRow.password);
      if (!match) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const bookingsThisMonth = await getClientBookingsThisMonth(userRow.client_id);
      const payload: AuthPayload = { id: userRow.client_id, role: userRow.role, type: 'user' };
      await issueAuthTokens(res, payload, `user:${userRow.client_id}`);
      return res.json({
        role: userRow.role,
        name: `${userRow.first_name} ${userRow.last_name}`,
        bookingsThisMonth,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const staffQuery = await pool.query(
      `SELECT id, first_name, last_name, email, password, role, access FROM staff WHERE email = $1`,
      [email]
    );
    if ((staffQuery.rowCount ?? 0) > 0) {
      const staff = staffQuery.rows[0];
      if (!staff.password) {
        return res
          .status(403)
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
      });
    }

    const agency = await getAgencyByEmail(email);
    if (!agency) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!agency.password) {
      return res
        .status(403)
        .json({ message: 'Password setup link expired' });
    }
    const match = await bcrypt.compare(password, agency.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const payload: AuthPayload = {
      id: agency.id,
      role: 'agency',
      type: 'agency',
    };
    await issueAuthTokens(res, payload, `agency:${agency.id}`);
    res.json({
      role: 'agency',
      name: agency.name,
      id: agency.id,
      access: [],
    });
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
      `INSERT INTO clients (first_name, last_name, email, phone, client_id, role, password, online_access, profile_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        firstName || null,
        lastName || null,
        email || null,
        phone || null,
        clientId,
        role,
        hashedPassword,
        onlineAccess,
        profileLink,
      ],
    );

    if (sendPasswordLink && email) {
      const token = await generatePasswordSetupToken('clients', clientId);
      const params: Record<string, unknown> = {
        link: `${config.frontendOrigins[0]}/set-password?token=${token}`,
        token,
        clientId,
      };
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

    const usersResult = await pool.query(
      `SELECT client_id, first_name, last_name, email, phone, password
       FROM clients
       WHERE (first_name || ' ' || last_name) ILIKE $1
          OR email ILIKE $1
          OR phone ILIKE $1
          OR CAST(client_id AS TEXT) ILIKE $1
       ORDER BY first_name, last_name ASC
       LIMIT 5`,
      [`%${search}%`]
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
      `SELECT client_id, first_name, last_name, email, phone, online_access, password
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
      clientId: row.client_id,
      onlineAccess: row.online_access,
      hasPassword: row.password != null,
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
        `SELECT id, first_name, last_name, email, access FROM staff WHERE id = $1`,
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
        role: 'staff',
        roles: row.access || [],
      });
    }

    if (user.type === 'volunteer') {
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
    }

    if (user.type === 'agency') {
      const result = await pool.query(
        `SELECT id, name, email, contact_info FROM agencies WHERE id = $1`,
        [user.id],
      );
      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const row = result.rows[0];
      return res.json({
        id: row.id,
        firstName: row.name,
        lastName: '',
        email: row.email,
        phone: row.contact_info,
        role: 'agency',
      });
    }

    const result = await pool.query(
      `SELECT client_id, first_name, last_name, email, phone, role
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
      clientId: row.client_id,
      role: row.role,
      bookingsThisMonth,
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    next(error);
  }
}

export async function updateMyProfile(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { email, phone } = req.body as { email?: string; phone?: string };
  try {
    if (user.type === 'staff') {
      const result = await pool.query(
        `UPDATE staff SET email = COALESCE($1, email)
         WHERE id = $2
         RETURNING id, first_name, last_name, email, access`,
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
        role: 'staff',
        roles: row.access || [],
      });
    }

    if (user.type === 'volunteer') {
      const result = await pool.query(
        `UPDATE volunteers
         SET email = COALESCE($1, email),
             phone = COALESCE($2, phone)
         WHERE id = $3
         RETURNING id, first_name, last_name, email, phone`,
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
        role: 'volunteer',
        trainedAreas: trainedRes.rows.map(r => r.name),
      });
    }

    if (user.type === 'agency') {
      const result = await pool.query(
        `UPDATE agencies
         SET email = COALESCE($1, email),
             contact_info = COALESCE($2, contact_info)
         WHERE id = $3
         RETURNING id, name, email, contact_info`,
        [email, phone, user.id],
      );
      if ((result.rowCount ?? 0) === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const row = result.rows[0];
      return res.json({
        id: row.id,
        firstName: row.name,
        lastName: '',
        email: row.email,
        phone: row.contact_info,
        role: 'agency',
      });
    }

    const result = await pool.query(
      `UPDATE clients
       SET email = COALESCE($1, email),
           phone = COALESCE($2, phone)
       WHERE client_id = $3
       RETURNING client_id, first_name, last_name, email, phone, role`,
      [email, phone, user.id],
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
      clientId: row.client_id,
      role: row.role,
      bookingsThisMonth,
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
  const { firstName, lastName, email, phone, onlineAccess, password } =
    req.body as {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
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
             online_access = true, password = COALESCE($5, password)
         WHERE client_id = $6
         RETURNING client_id, first_name, last_name, email, phone, profile_link`,
        [
          firstName,
          lastName,
          email || null,
          phone || null,
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
        profileLink: row.profile_link,
      });
    }

    const result = await pool.query(
      `UPDATE clients
       SET first_name = $1, last_name = $2, email = $3, phone = $4
       WHERE client_id = $5
       RETURNING client_id, first_name, last_name, email, phone, profile_link`,
      [firstName, lastName, email || null, phone || null, clientId],
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
      profileLink: row.profile_link,
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
    logger.error('Error deleting user:', error);
    next(error);
  }
}

