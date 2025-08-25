import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger';
import { createStaffSchema } from '../../schemas/admin/staffSchemas';
import { StaffAccess } from '../../models/staff';

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
  defaultAccess?: StaffAccess[],
) {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const { firstName, lastName, email, password, access } = parsed.data;

  let finalAccess: StaffAccess[];
  if (defaultAccess) {
    finalAccess = defaultAccess;
  } else {
    finalAccess = access && access.length > 0 ? access : ['pantry'];
  }

  const role = 'staff';

  try {
    const emailCheck = await pool.query('SELECT id FROM staff WHERE email = $1', [email]);
    if ((emailCheck.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO staff (first_name, last_name, role, email, password, access) VALUES ($1, $2, $3, $4, $5, $6)`,
      [firstName, lastName, role, email, hashed, finalAccess]
    );

    res.status(201).json({ message: 'Staff created' });
  } catch (error) {
    logger.error('Error creating staff:', error);
    next(error);
  }
}

export async function searchStaff(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { query } = req.query as { query?: string };
  if (!query) {
    return res.json([]);
  }
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name FROM staff WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1`,
      [`%${query}%`],
    );
    const staff = result.rows.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
    }));
    res.json(staff);
  } catch (error) {
    logger.error('Error searching staff:', error);
    next(error);
  }
}

