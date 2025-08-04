import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['authorization'];
  if (!token || typeof token !== 'string') {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    // Simple: use token as user.id to find user
    const userRes = await pool.query(
      'SELECT id, name, email, role, phone FROM users WHERE id = $1',
      [token]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = {
      ...userRes.rows[0],
      id: userRes.rows[0].id.toString(), // ensure string
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Database error' });
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
