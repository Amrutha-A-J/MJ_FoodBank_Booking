import { Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';

export async function updateTrainedArea(req: Request, res: Response) {
  const { id } = req.params;
  const { roleId } = req.body as { roleId?: number };
  if (typeof roleId !== 'number') {
    return res
      .status(400)
      .json({ message: 'roleId must be provided as a number' });
  }
  try {
    const validRole = await pool.query(
      `SELECT id FROM volunteer_roles WHERE id = $1`,
      [roleId]
    );
    if (validRole.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid roleId' });
    }
    const result = await pool.query(
      `UPDATE volunteers SET trained_role_id = $1 WHERE id = $2 RETURNING id, trained_role_id`,
      [roleId, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating trained area:', error);
    res.status(500).json({
      message: `Database error updating trained area: ${(error as Error).message}`,
    });
  }
}

export async function loginVolunteer(req: Request, res: Response) {
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
    res.json({
      token: `volunteer:${volunteer.id}`,
      role: 'volunteer',
      name: `${volunteer.first_name} ${volunteer.last_name}`,
    });
  } catch (error) {
    console.error('Error logging in volunteer:', error);
    res.status(500).json({
      message: `Database error logging in volunteer: ${(error as Error).message}`,
    });
  }
}

export async function createVolunteer(req: Request, res: Response) {
  const {
    firstName,
    lastName,
    username,
    password,
    email,
    phone,
    roleId,
  } = req.body as {
    firstName?: string;
    lastName?: string;
    username?: string;
    password?: string;
    email?: string;
    phone?: string;
    roleId?: number;
  };

  if (
    !firstName ||
    !lastName ||
    !username ||
    !password ||
    typeof roleId !== 'number'
  ) {
    return res.status(400).json({
      message: 'First name, last name, username, password and role required',
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

    const validRole = await pool.query(
      `SELECT id FROM volunteer_roles WHERE id = $1`,
      [roleId]
    );
    if (validRole.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid roleId' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO volunteers (first_name, last_name, trained_role_id, email, phone, username, password)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [firstName, lastName, roleId, email, phone, username, hashed]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating volunteer:', error);
    res.status(500).json({
      message: `Database error creating volunteer: ${(error as Error).message}`,
    });
  }
}

export async function searchVolunteers(req: Request, res: Response) {
  try {
    const rawSearch = (req.query.search as string) || '';
    const search = rawSearch.trim();

    if (search.length < 3) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT id, first_name, last_name, trained_role_id
       FROM volunteers
       WHERE (first_name || ' ' || last_name) ILIKE $1
          OR email ILIKE $1
          OR phone ILIKE $1
          OR username ILIKE $1
       ORDER BY first_name, last_name
       LIMIT 5`,
      [`%${search}%`]
    );

    const formatted = result.rows.map(v => ({
      id: v.id,
      name: `${v.first_name} ${v.last_name}`.trim(),
      trainedArea: v.trained_role_id === null ? null : Number(v.trained_role_id),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error searching volunteers:', error);
    res.status(500).json({
      message: `Database error searching volunteers: ${(error as Error).message}`,
    });
  }
}
