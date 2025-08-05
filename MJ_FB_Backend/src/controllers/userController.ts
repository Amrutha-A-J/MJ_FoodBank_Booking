import { Request, Response } from 'express';
import pool from '../db';
import { UserRole } from '../models/user';
import bcrypt from 'bcrypt';
import { updateBookingsThisMonth } from '../utils/bookingUtils';

export async function loginUser(req: Request, res: Response) {
  const { email, password, clientId } = req.body;

  try {
    if (clientId) {
      if (!password) {
        return res
          .status(400)
          .json({ message: 'Client ID and password required' });
      }
      const userQuery = await pool.query(
        `SELECT id, first_name, last_name, role, password FROM users WHERE client_id = $1`,
        [clientId]
      );
      if (userQuery.rowCount === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const user = userQuery.rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const bookingsThisMonth = await updateBookingsThisMonth(user.id);
      return res.json({
        token: `user:${user.id}`,
        role: user.role,
        name: `${user.first_name} ${user.last_name}`,
        bookingsThisMonth,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const staffQuery = await pool.query(
      `SELECT id, first_name, last_name, email, password, role FROM staff WHERE email = $1`,
      [email]
    );
    if (staffQuery.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const staff = staffQuery.rows[0];
    const match = await bcrypt.compare(password, staff.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({
      token: `staff:${staff.id}`,
      role: staff.role,
      name: `${staff.first_name} ${staff.last_name}`,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res
      .status(500)
      .json({ message: `Database error logging in: ${(error as Error).message}` });
  }
}

export async function createUser(req: Request, res: Response) {
  if (
    !req.user ||
    !['staff', 'volunteer_coordinator', 'admin'].includes(req.user.role)
  ) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { firstName, lastName, email, phone, clientId, role, password } =
    req.body as {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      clientId: number;
      role: UserRole;
      password: string;
    };

  if (!firstName || !lastName || !clientId || !role || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  if (clientId < 1 || clientId > 9999999) {
    return res
      .status(400)
      .json({ message: 'Client ID must be between 1 and 9,999,999' });
  }

  try {
    const check = await pool.query('SELECT id FROM users WHERE client_id = $1', [clientId]);
    if (check.rowCount && check.rowCount > 0) {
      return res.status(400).json({ message: 'Client ID already exists' });
    }

    if (email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (emailCheck.rowCount && emailCheck.rowCount > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, client_id, role, password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [firstName, lastName, email || null, phone || null, clientId, role, hashedPassword]
    );

    res.status(201).json({ message: 'User created' });
  } catch (error) {
    console.error('Error creating user:', error);
    res
      .status(500)
      .json({ message: `Database error creating user: ${(error as Error).message}` });
  }
}

export async function searchUsers(req: Request, res: Response) {
  try {
    const rawSearch = (req.query.search as string) || '';
    const search = rawSearch.trim();

    if (search.length < 3) {
      return res.json([]); // short input: skip query
    }

    const usersResult = await pool.query(
      `SELECT id, first_name, last_name, email, phone, client_id
       FROM users
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
    console.error('Error searching users:', (error as Error).message);
    res
      .status(500)
      .json({ message: `Server error searching users: ${(error as Error).message}` });
  }
}

