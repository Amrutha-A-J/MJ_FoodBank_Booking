import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

function getCookieToken(req: Request) {
  const cookie = req.headers.cookie;
  if (!cookie) return undefined;
  const cookies = Object.fromEntries(
    cookie.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    }),
  );
  return cookies.token;
}

export async function verifyVolunteerToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;
  if (authHeader && typeof authHeader === 'string') {
    token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader;
  } else {
    token = getCookieToken(req);
  }
  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

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
    logger.error('Volunteer auth error:', error);
    next(error);
  }
}
