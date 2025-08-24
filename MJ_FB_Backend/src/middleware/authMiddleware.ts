import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import config from '../config';
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

type AuthResult =
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'ok'; user: any };

async function authenticate(req: Request): Promise<AuthResult> {
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
    return { status: 'missing' };
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: number | string;
      role: string;
      type: string;
      userId?: number | string;
      userRole?: string;
      access?: string[];
    };
    const { id, type, role, userId, userRole, access } = decoded;
    if (type === 'staff') {
      const staffRes = await pool.query(
        'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
        [id],
      );
      if (staffRes.rowCount === 0) {
        return { status: 'invalid' };
      }
      return {
        status: 'ok',
        user: {
          id: staffRes.rows[0].id.toString(),
          type: 'staff',
          role,
          name: `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}`,
          email: staffRes.rows[0].email,
          access: access || [],
        },
      };
    }

    if (type === 'user') {
      const userRes = await pool.query(
        'SELECT id, first_name, last_name, email, role, phone FROM users WHERE id = $1',
        [id],
      );
      if (userRes.rowCount && userRes.rowCount > 0) {
        return {
          status: 'ok',
          user: {
            id: userRes.rows[0].id.toString(),
            type: 'user',
            role,
            email: userRes.rows[0].email,
            phone: userRes.rows[0].phone,
            name: `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`,
          },
        };
      }
      return { status: 'invalid' };
    }

    if (type === 'volunteer') {
      const volRes = await pool.query(
        'SELECT id, first_name, last_name, email FROM volunteers WHERE id = $1',
        [id],
      );
      if (volRes.rowCount === 0) {
        return { status: 'invalid' };
      }
      return {
        status: 'ok',
        user: {
          id: volRes.rows[0].id.toString(),
          type: 'volunteer',
          role: 'volunteer',
          email: volRes.rows[0].email,
          name: `${volRes.rows[0].first_name} ${volRes.rows[0].last_name}`,
          ...(userId && { userId: String(userId) }),
          ...(userRole && { userRole }),
        },
      };
    }

    return { status: 'invalid' };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      logger.warn('Token expired');
      return { status: 'expired' };
    }
    logger.error('Auth error:', error);
    return { status: 'invalid' };
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const result = await authenticate(req);
  if (result.status === 'ok') {
    req.user = result.user as any;
    return next();
  }
  if (result.status === 'expired') {
    res.clearCookie('token');
    return res.status(401).json({ message: 'Token expired' });
  }
  const message = result.status === 'missing' ? 'Missing token' : 'Invalid token';
  return res.status(401).json({ message });
}

export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result = await authenticate(req);
  if (result.status === 'ok') {
    req.user = result.user as any;
    return next();
  }
  if (result.status === 'expired') {
    res.clearCookie('token');
    return res.status(401).json({ message: 'Token expired' });
  }
  if (result.status === 'invalid') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  return next();
}

export function authorizeRoles(...allowedRoles: string[]) {
  const hierarchy: Record<string, string[]> = {};

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { role, type, userRole } = req.user as any;

    const effectiveRoles = new Set([role, type]);
    if (userRole) effectiveRoles.add(userRole);
    (hierarchy[role] || []).forEach(r => effectiveRoles.add(r));

    if (!allowedRoles.some(r => effectiveRoles.has(r))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
}

export function authorizeAccess(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { access = [] } = req.user as any;
    if (!allowed.some(a => (access as string[]).includes(a))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
