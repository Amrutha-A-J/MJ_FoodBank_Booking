import { Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
import type { StaffRole } from '../models/staff';

export async function checkStaffExists(_req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM staff');
    const count = parseInt(result.rows[0].count, 10);
    res.json({ exists: count > 0 });
  } catch (error) {
    console.error('Error checking staff:', error);
    res
      .status(500)
      .json({ message: `Database error checking staff: ${(error as Error).message}` });
  }
}

export async function createAdmin(req: Request, res: Response) {
  const { firstName, lastName, email, password } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const exists = await pool.query('SELECT COUNT(*) FROM staff');
    if (parseInt(exists.rows[0].count, 10) > 0) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const emailCheck = await pool.query('SELECT id FROM staff WHERE email = $1', [email]);
    if (emailCheck.rowCount && emailCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO staff (first_name, last_name, role, email, password) VALUES ($1, $2, 'admin', $3, $4)`,
      [firstName, lastName, email, hashed]
    );

    res.status(201).json({ message: 'Admin account created' });
  } catch (error) {
    console.error('Error creating admin:', error);
    res
      .status(500)
      .json({ message: `Database error creating admin: ${(error as Error).message}` });
  }
}

export async function createStaff(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { firstName, lastName, role, email, password } = req.body as {
    firstName: string;
    lastName: string;
    role: StaffRole;
    email: string;
    password: string;
  };

  if (!firstName || !lastName || !role || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  if (!['staff', 'volunteer_coordinator', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const emailCheck = await pool.query('SELECT id FROM staff WHERE email = $1', [email]);
    if (emailCheck.rowCount && emailCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO staff (first_name, last_name, role, email, password) VALUES ($1, $2, $3, $4, $5)`,
      [firstName, lastName, role, email, hashed]
    );

    res.status(201).json({ message: 'Staff created' });
  } catch (error) {
    console.error('Error creating staff:', error);
    res
      .status(500)
      .json({ message: `Database error creating staff: ${(error as Error).message}` });
  }
}

