import { Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';

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
