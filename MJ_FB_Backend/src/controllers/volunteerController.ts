import { Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';

async function ensureVolunteersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS volunteers (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      trained_areas TEXT[] DEFAULT '{}',
      email TEXT,
      phone TEXT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);
}

export async function updateTrainedAreas(req: Request, res: Response) {
  const { id } = req.params;
  const { trainedAreas } = req.body as { trainedAreas?: string[] };
  if (!Array.isArray(trainedAreas)) {
    return res.status(400).json({ message: 'trainedAreas must be an array' });
  }
  try {
    const result = await pool.query(
      `UPDATE volunteers SET trained_areas = $1 WHERE id = $2 RETURNING id, trained_areas`,
      [trainedAreas, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating trained areas:', error);
    res.status(500).json({
      message: `Database error updating trained areas: ${(error as Error).message}`,
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
  const { firstName, lastName, username, password, email, phone } = req.body as {
    firstName?: string;
    lastName?: string;
    username?: string;
    password?: string;
    email?: string;
    phone?: string;
  };

  if (!firstName || !lastName || !username || !password) {
    return res.status(400).json({
      message: 'First name, last name, username and password required',
    });
  }

  try {
    await ensureVolunteersTable();
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

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO volunteers (first_name, last_name, trained_areas, email, phone, username, password)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [firstName, lastName, [], email, phone, username, hashed]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating volunteer:', error);
    res.status(500).json({
      message: `Database error creating volunteer: ${(error as Error).message}`,
    });
  }
}
