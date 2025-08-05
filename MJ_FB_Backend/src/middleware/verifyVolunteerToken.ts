import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export async function verifyVolunteerToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ message: 'Missing token' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader;

  const match = token.match(/^volunteer[:\-](\d+)$/);
  if (!match) {
    return res.status(401).json({ message: 'Invalid token format' });
  }
  const [, id] = match;

  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email FROM volunteers WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    const volunteer = result.rows[0];
    req.user = {
      id: volunteer.id.toString(),
      role: 'volunteer',
      name: `${volunteer.first_name} ${volunteer.last_name}`,
      email: volunteer.email,
    } as any;
    next();
  } catch (error) {
    console.error('Volunteer auth error:', error);
    res.status(500).json({
      message: `Database error during volunteer authentication: ${(error as Error).message}`,
    });
  }
}
