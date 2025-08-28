import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { UserRole } from '../models/user';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import issueAuthTokens, { AuthPayload } from '../utils/authUtils';
import { getAgencyByEmail } from '../models/agency';
import { validatePassword } from '../utils/passwordUtils';

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
        `SELECT id, first_name, last_name, role, password FROM clients WHERE client_id = $1 AND online_access = true`,
        [clientId]
      );
      if ((userQuery.rowCount ?? 0) === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const user = userQuery.rows[0];
      if (!user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const bookingsRes = await pool.query(
        'SELECT bookings_this_month FROM clients WHERE id = $1',
        [user.id],
      );
      const bookingsThisMonth = bookingsRes.rows[0]?.bookings_this_month ?? 0;
      const payload: AuthPayload = { id: user.id, role: user.role, type: 'user' };
      await issueAuthTokens(res, payload, `user:${user.id}`);
      return res.json({
        role: user.role,
        name: `${user.first_name} ${user.last_name}`,
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

// Self-service registration for existing clients. Validates the provided
// details and enables online access for the client.
export async function registerUser(req: Request, res: Response, next: NextFunction) {
  const { clientId, firstName, lastName, email, phone, password, otp } =
    req.body as {
      clientId: number;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      password: string;
      otp: string;
    };

  try {
    // Ensure client exists and has not registered yet
    const clientRes = await pool.query(
      'SELECT id, online_access, role FROM clients WHERE client_id = $1',
      [clientId],
    );
    if ((clientRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    const existing = clientRes.rows[0];
    if (existing.online_access) {
      return res.status(400).json({ message: 'Online access already enabled' });
    }

    // Verify OTP from a temporary store
    const otpRes = await pool.query(
      'SELECT otp FROM client_otps WHERE client_id = $1',
      [clientId],
    );
    const validOtp = otpRes.rows[0]?.otp;
    if (!validOtp || validOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Ensure email uniqueness
    const emailCheck = await pool.query('SELECT id FROM clients WHERE email = $1', [
      email,
    ]);
    if ((emailCheck.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const pwError = validatePassword(password);
    if (pwError) {
      return res.status(400).json({ message: pwError });
    }

    const hashed = await bcrypt.hash(password, 10);

    const updateRes = await pool.query(
      `UPDATE clients
         SET first_name = $1, last_name = $2, email = $3, phone = $4, password = $5, online_access = true
       WHERE client_id = $6
       RETURNING id, role, first_name, last_name`,
      [firstName, lastName, email, phone || null, hashed, clientId],
    );

    await pool.query('DELETE FROM client_otps WHERE client_id = $1', [clientId]);

    const updated = updateRes.rows[0];
    const payload: AuthPayload = {
      id: updated.id,
      role: updated.role,
      type: 'user',
    };
    await issueAuthTokens(res, payload, `user:${updated.id}`);

    return res.json({
      role: updated.role,
      name: `${updated.first_name} ${updated.last_name}`,
    });
  } catch (error) {
    logger.error('Error registering user:', error);
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { firstName, lastName, email, phone, clientId, role, password, onlineAccess } =
    req.body as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      clientId: number;
      role: UserRole;
      password?: string;
      onlineAccess: boolean;
    };

  if (!clientId || !role) {
    return res.status(400).json({ message: 'Client ID and role required' });
  }

  if (onlineAccess && (!firstName || !lastName || !password)) {
    return res.status(400).json({ message: 'Missing fields for online account' });
  }

  if (password) {
    const pwError = validatePassword(password);
    if (pwError) {
      return res.status(400).json({ message: pwError });
    }
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
    const check = await pool.query('SELECT id FROM clients WHERE client_id = $1', [clientId]);
    if ((check.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Client ID already exists' });
    }

    if (email) {
      const emailCheck = await pool.query('SELECT id FROM clients WHERE email = $1', [email]);
      if ((emailCheck.rowCount ?? 0) > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const profileLink = `https://portal.link2feed.ca/org/1605/intake/${clientId}`;
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
      ]
    );

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
      `SELECT id, first_name, last_name, email, phone, client_id
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
      id: u.id,
      name: `${u.first_name} ${u.last_name}`.trim(),
      email: u.email,
      phone: u.phone,
      client_id: u.client_id,
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
      `SELECT id, first_name, last_name, email, phone, client_id
       FROM clients WHERE client_id = $1`,
      [clientId]
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      clientId: row.client_id,
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
    }

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, client_id, role, bookings_this_month
       FROM clients WHERE id = $1`,
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
      phone: row.phone,
      clientId: row.client_id,
      role: row.role,
      bookingsThisMonth: row.bookings_this_month ?? 0,
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
         RETURNING id, first_name, last_name, email, phone, username`,
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
        username: row.username,
        trainedAreas: trainedRes.rows.map(r => r.name),
      });
    }

    const result = await pool.query(
      `UPDATE clients
       SET email = COALESCE($1, email),
           phone = COALESCE($2, phone)
       WHERE id = $3
       RETURNING id, first_name, last_name, email, phone, client_id, role, bookings_this_month`,
      [email, phone, user.id],
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
      phone: row.phone,
      clientId: row.client_id,
      role: row.role,
      bookingsThisMonth: row.bookings_this_month ?? 0,
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
      `SELECT id, client_id, first_name, last_name, email, phone, profile_link
       FROM clients
       WHERE first_name IS NULL AND last_name IS NULL
       ORDER BY client_id ASC`,
    );
    const users = result.rows.map(row => ({
      id: row.id,
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
      if (!password || !firstName || !lastName) {
        return res
          .status(400)
          .json({ message: 'Missing fields for online access' });
      }

      if (email) {
        const emailCheck = await pool.query(
          'SELECT id FROM clients WHERE email = $1 AND client_id <> $2',
          [email, clientId],
        );
        if ((emailCheck.rowCount ?? 0) > 0) {
          return res.status(400).json({ message: 'Email already exists' });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `UPDATE clients
         SET first_name = $1, last_name = $2, email = $3, phone = $4,
             online_access = true, password = $5
         WHERE client_id = $6
         RETURNING id, client_id, first_name, last_name, email, phone, profile_link`,
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
        id: row.id,
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
       RETURNING id, client_id, first_name, last_name, email, phone, profile_link`,
      [firstName, lastName, email || null, phone || null, clientId],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
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

