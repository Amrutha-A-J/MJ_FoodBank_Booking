import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/env';
import logger from '../utils/logger';

function getTokenFromCookies(req: Request) {
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

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;
  if (authHeader && typeof authHeader === 'string') {
    token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader;
  } else {
    token = getTokenFromCookies(req);
  }
  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number | string;
      role: string;
      type: string;
    };
    const { id, type, role } = decoded;
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
        role,
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
          role,
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
    logger.error('Auth error:', error);
    next(error);
  }
}

export async function optionalAuthMiddleware(
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
    token = getTokenFromCookies(req);
  }
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number | string;
      role: string;
      type: string;
    };
    const { id, type, role } = decoded;
    if (type === 'staff') {
      const staffRes = await pool.query(
        'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
        [id],
      );
      if (staffRes.rowCount === 0) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      req.user = {
        id: staffRes.rows[0].id.toString(),
        type: 'staff',
        role,
        name: `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}`,
        email: staffRes.rows[0].email,
      } as any;
      return next();
    }

    if (type === 'user') {
      const userRes = await pool.query(
        'SELECT id, first_name, last_name, email, role, phone FROM users WHERE id = $1',
        [id],
      );
      if (userRes.rowCount && userRes.rowCount > 0) {
        req.user = {
          id: userRes.rows[0].id.toString(),
          type: 'user',
          role,
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
    logger.error('Auth error:', error);
    next(error);
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
