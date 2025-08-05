import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ message: 'Missing token' });
  }

  // Allow standard "Bearer" prefix but keep backwards compatibility with raw tokens
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  try {
    const [prefix, id] = token.split('-');

    if (prefix === 'user') {
      const userRes = await pool.query(
        'SELECT id, first_name, last_name, email, role, phone FROM users WHERE id = $1',
        [id]
      );

      if (userRes.rowCount === 0) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      req.user = {
        id: userRes.rows[0].id.toString(),
        role: userRes.rows[0].role,
        email: userRes.rows[0].email,
        phone: userRes.rows[0].phone,
        name: `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`,
      } as any;
      return next();
    }

    if (prefix === 'staff') {
      const staffRes = await pool.query(
        'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
        [id]
      );

      if (staffRes.rowCount === 0) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      req.user = {
        id: staffRes.rows[0].id.toString(),
        role: staffRes.rows[0].role,
        name: `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}`,
        email: staffRes.rows[0].email,
      } as any;
      return next();
    }

    return res.status(401).json({ message: 'Invalid token' });
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

    const expanded = new Set(allowedRoles);
    if (allowedRoles.includes('staff')) {
      expanded.add('volunteer_coordinator');
      expanded.add('admin');
    }

    if (!expanded.has(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
