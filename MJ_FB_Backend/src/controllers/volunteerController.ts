import { Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';

async function ensureVolunteersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS volunteers (
      id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      trained_areas INTEGER[]
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
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, password
       FROM users
       WHERE email = $1 AND role = 'volunteer'`,
      [email]
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
  const { firstName, lastName, email, password } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  };

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    await ensureVolunteersTable();
    const emailCheck = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (emailCheck.rowCount && emailCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userRes = await pool.query(
      `INSERT INTO users (first_name, last_name, email, role, password)
       VALUES ($1,$2,$3,'volunteer',$4)
       RETURNING id` ,
      [firstName, lastName, email, hashed]
    );
    const userId = userRes.rows[0].id;
    await pool.query(
      `INSERT INTO volunteers (id, trained_areas) VALUES ($1, $2)` ,
      [userId, []]
    );
    res.status(201).json({ id: userId });
  } catch (error) {
    console.error('Error creating volunteer:', error);
    res.status(500).json({
      message: `Database error creating volunteer: ${(error as Error).message}`,
    });
  }
}
