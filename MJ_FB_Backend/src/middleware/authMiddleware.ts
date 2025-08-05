import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ message: 'Missing token' });
  }

  // Allow standard "Bearer <token>" format in addition to raw tokens
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader;

  try {
    const match = token.match(/^(staff|user)[:\-](\d+)$/);
    if (!match) {
      return res.status(401).json({ message: 'Invalid token format' });
    }
    const [, type, id] = match;
    if (type === 'staff') {
      const staffRes = await pool.query(
        'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
        [id]
      );

      if (staffRes.rowCount === 0) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      req.user = {
        id: staffRes.rows[0].id.toString(),
        type: 'staff',
        role: staffRes.rows[0].role,
        name: `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}`,
        email: staffRes.rows[0].email,
      } as any;
      return next();
    }

    if (type === 'user') {
      const userRes = await pool.query(
        'SELECT id, first_name, last_name, email, role, phone FROM users WHERE id = $1',
        [id]
      );

      if (userRes.rowCount && userRes.rowCount > 0) {
        req.user = {
          id: userRes.rows[0].id.toString(),
          type: 'user',
          role: userRes.rows[0].role,
          email: userRes.rows[0].email,
          phone: userRes.rows[0].phone,
          name: `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`,
        } as any;
        return next();
      }

      return res.status(401).json({ message: 'Invalid token' });
    }

    return res.status(401).json({ message: 'Invalid token format' });
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
    const { role, type } = req.user as any;
    if (!allowedRoles.includes(role) && !allowedRoles.includes(type)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
