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
      'SELECT id, first_name, last_name, email, role, phone FROM users WHERE id = $1',
      [token]
    );

    if (userRes.rowCount && userRes.rowCount > 0) {
      req.user = {
        id: userRes.rows[0].id.toString(),
        role: userRes.rows[0].role,
        email: userRes.rows[0].email,
        phone: userRes.rows[0].phone,
        name: `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`,
      } as any;
      return next();
    }

    const staffRes = await pool.query(
      'SELECT id, first_name, last_name, email FROM staff WHERE id = $1',
      [token]
    );

    if (staffRes.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = {
      id: staffRes.rows[0].id.toString(),
      role: 'staff',
      name: `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}`,
      email: staffRes.rows[0].email,
    } as any;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res
      .status(500)
      .json({ message: `Database error during authentication: ${(error as Error).message}` });
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
