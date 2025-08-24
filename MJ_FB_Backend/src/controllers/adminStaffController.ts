import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import type { StaffRole } from '../models/staff';

export async function listStaff(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, role FROM staff ORDER BY last_name, first_name',
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing staff:', error);
    next(error);
  }
}

export async function searchStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const search = (req.query.search as string) ?? '';
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role FROM staff
       WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
       ORDER BY last_name, first_name`,
      [`%${search}%`],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error searching staff:', error);
    next(error);
  }
}

export async function getStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
      [id],
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Staff not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching staff:', error);
    next(error);
  }
}

export async function createStaff(req: Request, res: Response, next: NextFunction) {
  const { firstName, lastName, email, role, password } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    role: StaffRole;
    password: string;
  };
  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  try {
    const emailCheck = await pool.query('SELECT id FROM staff WHERE email = $1', [email]);
    if (emailCheck.rowCount && emailCheck.rowCount > 0) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO staff (first_name, last_name, role, email, password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, first_name, last_name, email, role`,
      [firstName, lastName, role, email, hashed],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating staff:', error);
    next(error);
  }
}

export async function updateStaff(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  const { firstName, lastName, email, role, password } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    role: StaffRole;
    password?: string;
  };
  if (!firstName || !lastName || !email || !role) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  try {
    const values: any[] = [firstName, lastName, role, email];
    let setPassword = '';
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      values.push(hashed);
      setPassword = `, password = $${values.length}`;
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE staff SET first_name = $1, last_name = $2, role = $3, email = $4${setPassword}
       WHERE id = $${values.length} RETURNING id, first_name, last_name, email, role`,
      values,
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Staff not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating staff:', error);
    next(error);
  }
}

export async function deleteStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM staff WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Staff not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting staff:', error);
    next(error);
  }
}

