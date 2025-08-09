import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';

export async function updateTrainedArea(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { id } = req.params;
  const { roleIds } = req.body as { roleIds?: number[] };
  if (!Array.isArray(roleIds) || roleIds.some(r => typeof r !== 'number')) {
    return res
      .status(400)
      .json({ message: 'roleIds must be provided as an array of numbers' });
  }
  try {
    const validRoles = await pool.query(
      `SELECT DISTINCT role_id FROM volunteer_roles WHERE role_id = ANY($1::int[])`,
      [roleIds]
    );
    if (validRoles.rowCount !== roleIds.length) {
      return res.status(400).json({ message: 'Invalid roleIds' });
    }
    await pool.query('DELETE FROM volunteer_trained_roles WHERE volunteer_id = $1', [id]);
    if (roleIds.length > 0) {
      await pool.query(
        `INSERT INTO volunteer_trained_roles (volunteer_id, role_id)
         SELECT $1, UNNEST($2::int[])`,
        [id, roleIds]
      );
    }
    res.json({ id: Number(id), roleIds });
  } catch (error) {
    logger.error('Error updating trained area:', error);
    next(error);
  }
}

export async function loginVolunteer(req: Request, res: Response, next: NextFunction) {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, username, password
       FROM volunteers
       WHERE username = $1`,
      [username]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const volunteer = result.rows[0];
    const match = await bcrypt.compare(password, volunteer.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = `volunteer:${volunteer.id}`;
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
    });
    res.json({
      token,
      role: 'volunteer',
      name: `${volunteer.first_name} ${volunteer.last_name}`,
    });
  } catch (error) {
    logger.error('Error logging in volunteer:', error);
    next(error);
  }
}

export async function createVolunteer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const {
    firstName,
    lastName,
    username,
    password,
    email,
    phone,
    roleIds,
  } = req.body as {
    firstName?: string;
    lastName?: string;
    username?: string;
    password?: string;
    email?: string;
    phone?: string;
    roleIds?: number[];
  };

  if (
    !firstName ||
    !lastName ||
    !username ||
    !password ||
    !Array.isArray(roleIds) ||
    roleIds.length === 0 ||
    roleIds.some(r => typeof r !== 'number')
  ) {
    return res.status(400).json({
      message: 'First name, last name, username, password and roles required',
    });
  }

  try {
    const usernameCheck = await pool.query('SELECT id FROM volunteers WHERE username=$1', [
      username,
    ]);
    if (usernameCheck.rowCount && usernameCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    if (email) {
      const emailCheck = await pool.query('SELECT id FROM volunteers WHERE email=$1', [
        email,
      ]);
      if (emailCheck.rowCount && emailCheck.rowCount > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const validRoles = await pool.query(
      `SELECT DISTINCT role_id FROM volunteer_roles WHERE role_id = ANY($1::int[])`,
      [roleIds]
    );
    if (validRoles.rowCount !== roleIds.length) {
      return res.status(400).json({ message: 'Invalid roleIds' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO volunteers (first_name, last_name, email, phone, username, password)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [firstName, lastName, email, phone, username, hashed]
    );
    const volunteerId = result.rows[0].id;
    await pool.query(
      `INSERT INTO volunteer_trained_roles (volunteer_id, role_id)
       SELECT $1, UNNEST($2::int[])`,
      [volunteerId, roleIds]
    );
    res.status(201).json({ id: volunteerId });
  } catch (error) {
    logger.error('Error creating volunteer:', error);
    next(error);
  }
}

export async function searchVolunteers(req: Request, res: Response, next: NextFunction) {
  try {
    const rawSearch = (req.query.search as string) || '';
    const search = rawSearch.trim();

    if (search.length < 3) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT v.id, v.first_name, v.last_name,
              ARRAY_REMOVE(ARRAY_AGG(vtr.role_id), NULL) AS role_ids
       FROM volunteers v
       LEFT JOIN volunteer_trained_roles vtr ON v.id = vtr.volunteer_id
       WHERE (v.first_name || ' ' || v.last_name) ILIKE $1
          OR v.email ILIKE $1
          OR v.phone ILIKE $1
          OR v.username ILIKE $1
       GROUP BY v.id
       ORDER BY v.first_name, v.last_name
       LIMIT 5`,
      [`%${search}%`]
    );

    const formatted = result.rows.map(v => ({
      id: v.id,
      name: `${v.first_name} ${v.last_name}`.trim(),
      trainedAreas: (v.role_ids || []).map(Number),
    }));

    res.json(formatted);
  } catch (error) {
    logger.error('Error searching volunteers:', error);
    next(error);
  }
}
