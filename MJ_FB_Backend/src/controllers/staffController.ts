import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
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

export async function createStaff(
  req: Request,
  res: Response,
  next: NextFunction,
  defaultAccess?: string[],
) {
  const { firstName, lastName, email, password, access } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    access?: string[];
  };

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  let finalAccess: string[];
  if (defaultAccess) {
    if (access !== undefined) {
      return res
        .status(400)
        .json({ message: 'Cannot set access for first staff member' });
    }
    finalAccess = defaultAccess;
  } else {
    finalAccess = Array.isArray(access) && access.length > 0 ? access : ['staff'];
  }

  if (!finalAccess.every(r => r === 'staff' || r === 'admin')) {
    return res.status(400).json({ message: 'Invalid access' });
  }

  const role = finalAccess.includes('admin') ? 'admin' : 'staff';

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

