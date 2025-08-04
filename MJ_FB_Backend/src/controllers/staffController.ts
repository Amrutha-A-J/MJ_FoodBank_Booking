import { Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';

export async function checkStaffExists(_req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM staff');
    const count = parseInt(result.rows[0].count, 10);
    res.json({ exists: count > 0 });
  } catch (error) {
    console.error('Error checking staff:', error);
    res.status(500).json({ message: 'Database error' });
  }
}

export async function createAdmin(req: Request, res: Response) {
  const { firstName, lastName, staffId, role, email, password } = req.body as {
    firstName: string;
    lastName: string;
    staffId: string;
    role: string;
    email: string;
    password: string;
  };

  if (!firstName || !lastName || !staffId || !role || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const exists = await pool.query('SELECT COUNT(*) FROM staff');
    if (parseInt(exists.rows[0].count, 10) > 0) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userRes = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'staff') RETURNING id`,
      [`${firstName} ${lastName}`, email, hashed]
    );
    const userId = userRes.rows[0].id;

    await pool.query(
      `INSERT INTO staff (id, first_name, last_name, staff_id, role, is_admin)
       VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [userId, firstName, lastName, staffId, role]
    );

    res.status(201).json({ message: 'Admin account created' });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Database error' });
  }
}

export async function createStaff(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { firstName, lastName, staffId, role, email, password } = req.body as {
    firstName: string;
    lastName: string;
    staffId: string;
    role: string;
    email: string;
    password: string;
  };

  if (!firstName || !lastName || !staffId || !role || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const adminCheck = await pool.query('SELECT is_admin FROM staff WHERE id = $1', [req.user.id]);
    if (adminCheck.rowCount === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userRes = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'staff') RETURNING id`,
      [`${firstName} ${lastName}`, email, hashed]
    );
    const userId = userRes.rows[0].id;

    await pool.query(
      `INSERT INTO staff (id, first_name, last_name, staff_id, role, is_admin)
       VALUES ($1, $2, $3, $4, $5, FALSE)`,
      [userId, firstName, lastName, staffId, role]
    );

    res.status(201).json({ message: 'Staff created' });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
