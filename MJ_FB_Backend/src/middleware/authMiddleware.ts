import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
import cookie from 'cookie';
import { cookieOptions } from '../utils/authUtils';
import type { RequestUser } from '../types/RequestUser';

function getTokenFromCookies(req: Request) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const cookies = cookie.parse(header);
  return cookies.token;
}

type AuthResult =
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'ok'; user: RequestUser };

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
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
    }) as {
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
      if ((staffRes.rowCount ?? 0) === 0) {
        return { status: 'invalid' };
      }
      const user: RequestUser = {
        id: staffRes.rows[0].id.toString(),
        type: 'staff',
        role,
        name: `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}`,
        email: staffRes.rows[0].email,
        access: access || [],
      };
      return {
        status: 'ok',
        user,
      };
    }

      if (type === 'user') {
        const userRes = await pool.query(
          'SELECT client_id, first_name, last_name, email, role, phone, address FROM clients WHERE client_id = $1',
          [id],
        );
        if ((userRes.rowCount ?? 0) > 0) {
          const user: RequestUser = {
            id: userRes.rows[0].client_id.toString(),
            type: 'user',
            role,
            email: userRes.rows[0].email,
            phone: userRes.rows[0].phone,
            address: userRes.rows[0].address,
            name: `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`,
          };
          return {
            status: 'ok',
            user,
          };
        }
        return { status: 'invalid' };
      }

    if (type === 'volunteer') {
      const volRes = await pool.query(
        'SELECT id, first_name, last_name, email FROM volunteers WHERE id = $1',
        [id],
      );
      if ((volRes.rowCount ?? 0) === 0) {
        return { status: 'invalid' };
      }
      const user: RequestUser = {
        id: volRes.rows[0].id.toString(),
        type: 'volunteer',
        role: 'volunteer',
        email: volRes.rows[0].email,
        name: `${volRes.rows[0].first_name} ${volRes.rows[0].last_name}`,
        ...(userId && { userId: String(userId) }),
        ...(userRole && { userRole: userRole as 'shopper' | 'delivery' }),
      };
      return {
        status: 'ok',
        user,
      };
    }

    if (type === 'agency') {
      const agRes = await pool.query(
        'SELECT id, name, email FROM agencies WHERE id = $1',
        [id],
      );
      if ((agRes.rowCount ?? 0) === 0) {
        return { status: 'invalid' };
      }
      const user: RequestUser = {
        id: agRes.rows[0].id.toString(),
        type: 'agency',
        role: 'agency',
        email: agRes.rows[0].email,
        name: agRes.rows[0].name,
      };
      return {
        status: 'ok',
        user,
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
    req.user = result.user;
    return next();
  }
  if (result.status === 'expired') {
    res.clearCookie('token', cookieOptions);
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
    req.user = result.user;
    return next();
  }
  if (result.status === 'expired') {
    res.clearCookie('token', cookieOptions);
    return res.status(401).json({ message: 'Token expired' });
  }
  if (result.status === 'invalid') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  return next();
}

const roleHierarchy: Record<string, string[]> = {
  staff: ['volunteer'],
};

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { role, type, userRole, access = [] } = req.user!;

    // Admins (by role or access token) are permitted to access any route
    if (role === 'admin' || (access as string[]).includes('admin')) {
      return next();
    }

    const effectiveRoles = new Set([role, type]);
    if (userRole) effectiveRoles.add(userRole);
    (roleHierarchy[role] || []).forEach(r => effectiveRoles.add(r));

    if (!allowedRoles.some(r => effectiveRoles.has(r))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
}

export function authorizeAccess(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { role, access = [] } = req.user!;

    // Admins have implicit access to all areas
    if (role === 'admin' || (access as string[]).includes('admin')) {
      return next();
    }

    if (!allowed.some(a => (access as string[]).includes(a))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
