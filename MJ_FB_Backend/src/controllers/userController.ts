import { Request, Response } from 'express';
import pool from '../db';
import { UserRole } from '../data'; // keep only for typing if needed

export async function loginUser(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // In production: compare hashed passwords instead
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Simple token: user.id (for dev only; use JWT in prod)
    res.json({ token: user.id.toString(), role: user.role, name: user.name });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Database error' });
  }
}

export async function createUser(req: Request, res: Response) {
  if (!req.user || req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { name, email, password, role, phone } = req.body as {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
  };

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    // Check duplicate email
    const check = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (check.rowCount && check.rowCount > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Insert user
    await pool.query(
      `INSERT INTO users (name, email, password, role, phone)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, password, role, phone || null]
    );

    res.status(201).json({ message: 'User created' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Database error' });
  }
}

export async function searchUsers(req: Request, res: Response) {
  try {
    const rawSearch = req.query.search as string || '';
    const search = rawSearch.trim();

    if (search.length < 3) {
      return res.json([]); // short input: skip query
    }

    const usersResult = await pool.query(
      `SELECT id, name, email, phone
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
       ORDER BY name ASC
       LIMIT 5`,
      [`%${search}%`]
    );

    res.json(usersResult.rows);
  } catch (error) {
    console.error('Error searching users:', (error as Error).message);
    res.status(500).json({ message: 'Server error searching users' });
  }
}

