import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger';
import { createStaffSchema, updateStaffSchema } from '../../schemas/admin/staffSchemas';
import { generatePasswordSetupToken, buildPasswordSetupEmailParams } from '../../utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../../utils/emailUtils';
import config from '../../config';
import { parseIdParam } from '../../utils/parseIdParam';
import { parsePaginationParams } from '../../utils/parsePaginationParams';

type StaffUpdateValues = [string, string, string, string[], string, ...(string | number)[]];

const normalizeEmailAddress = (value: string) => value.trim().toLowerCase();

export async function listStaff(req: Request, res: Response, next: NextFunction) {
  let limit: number;
  let offset: number;
  try {
    ({ limit, offset } = parsePaginationParams(req, 25, 100));
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, access FROM staff
       ORDER BY first_name, last_name LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const staff = result.rows.map(r => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      access: r.access || [],
    }));
    res.json(staff);
  } catch (error) {
    logger.error('Error listing staff:', error);
    next(error);
  }
}

export async function getStaff(req: Request, res: Response, next: NextFunction) {
  const id = parseIdParam(req.params.id);
  if (id === null) return res.status(400).json({ message: 'Invalid ID' });
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, access FROM staff WHERE id = $1',
      [id],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      access: r.access || [],
    });
  } catch (error) {
    logger.error('Error fetching staff:', error);
    next(error);
  }
}

export async function createStaff(req: Request, res: Response, next: NextFunction) {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }
  const { firstName, lastName, email, access = ['pantry'] } = parsed.data;
  try {
    const normalizedEmail = normalizeEmailAddress(email);
    const emailCheck = await pool.query('SELECT id FROM staff WHERE LOWER(email) = $1', [normalizedEmail]);
    if ((emailCheck.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const role = 'staff';
    const result = await pool.query(
      `INSERT INTO staff (first_name, last_name, role, email, password, access, consent) VALUES ($1, $2, $3, $4, NULL, $5, true) RETURNING id`,
      [firstName, lastName, role, normalizedEmail, access],
    );
    const staffId = result.rows[0].id;
    const token = await generatePasswordSetupToken('staff', staffId);
    const params = buildPasswordSetupEmailParams('staff', token);
    await sendTemplatedEmail({
      to: normalizedEmail,
      templateId: config.passwordSetupTemplateId,
      params,
    });
    res.status(201).json({ message: 'Staff created' });
  } catch (error) {
    logger.error('Error creating staff:', error);
    next(error);
  }
}

export async function updateStaff(req: Request, res: Response, next: NextFunction) {
  const id = parseIdParam(req.params.id);
  if (id === null) return res.status(400).json({ message: 'Invalid ID' });
  const parsed = updateStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }
  const { firstName, lastName, email, password, access } = parsed.data;
  const role = 'staff';
  try {
    const setClauses = [
      'first_name=$1',
      'last_name=$2',
      'email=$3',
      'access=$4',
      'role=$5',
    ];
    const values: StaffUpdateValues = [firstName, lastName, email, access, role];
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      values.push(hashed);
      setClauses.push(`password=$${values.length}`);
    }
    const query = `UPDATE staff SET ${setClauses.join(', ')} WHERE id=$${
      values.length + 1
    }`;
    values.push(id);
    const result = await pool.query(query, values);
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    res.json({ message: 'Staff updated' });
  } catch (error) {
    logger.error('Error updating staff:', error);
    next(error);
  }
}

export async function deleteStaff(req: Request, res: Response, next: NextFunction) {
  const id = parseIdParam(req.params.id);
  if (id === null) return res.status(400).json({ message: 'Invalid ID' });
  try {
    const result = await pool.query('DELETE FROM staff WHERE id = $1', [id]);
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    res.json({ message: 'Staff deleted' });
  } catch (error) {
    logger.error('Error deleting staff:', error);
    next(error);
  }
}

export async function searchStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const rawSearch = (req.query.search as string) || '';
    const search = rawSearch.trim();
    if (search.length < 3) {
      return res.json([]);
    }
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, access FROM staff
       WHERE (first_name || ' ' || last_name) ILIKE $1 OR email ILIKE $1
       ORDER BY first_name, last_name LIMIT 5`,
      [`%${search}%`],
    );
    const formatted = result.rows.map(r => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      access: r.access || [],
    }));
    res.json(formatted);
  } catch (error) {
    logger.error('Error searching staff:', error);
    next(error);
  }
}

