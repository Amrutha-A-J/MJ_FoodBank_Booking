import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
import type { StaffRole } from '../models/staff';
import logger from '../utils/logger';

export async function checkStaffExists(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM staff');
    const count = parseInt(result.rows[0].count, 10);
    res.json({ exists: count > 0 });
  } catch (error) {
    logger.error('Error checking staff:', error);
    next(error);
  }
}

export async function createStaff(req: Request, res: Response, next: NextFunction) {
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

  if (role !== 'staff') {
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
    logger.error('Error creating staff:', error);
    next(error);
  }
}

