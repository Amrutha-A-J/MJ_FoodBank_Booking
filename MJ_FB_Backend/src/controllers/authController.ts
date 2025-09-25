import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';
import { validatePassword } from '../utils/passwordUtils';
import cookie from 'cookie';
import { getCookieOptions, getRefreshExpiryMs } from '../utils/authUtils';
import {
  generatePasswordSetupToken,
  verifyPasswordSetupToken,
  markPasswordTokenUsed,
  buildPasswordSetupEmailParams,
} from '../utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../utils/emailUtils';
import { findUserByEmail } from '../models/userLookup';

// Map of identifier -> timeout. Each entry schedules its own cleanup via
// setTimeout so the cache doesn't grow indefinitely.
export const resendLimit = new Map<string, ReturnType<typeof setTimeout>>();
export const RESEND_WINDOW_MS = 60_000;

export const TABLE_MAP = {
  staff: { table: 'staff', idColumn: 'id' },
  volunteer: { table: 'volunteers', idColumn: 'id' },
  client: { table: 'clients', idColumn: 'client_id' },
} as const;

type IdentifierPayload = {
  email?: unknown;
  clientId?: unknown;
};

function normalizeIdentifiers({ email, clientId }: IdentifierPayload) {
  let normalizedEmail: string | undefined;
  if (typeof email === 'string') {
    const trimmed = email.trim();
    if (trimmed !== '') {
      normalizedEmail = trimmed;
    }
  } else if (typeof email === 'number') {
    const converted = String(email).trim();
    if (converted !== '') {
      normalizedEmail = converted;
    }
  }

  const rawClientId =
    typeof clientId === 'string' ? clientId.trim() : typeof clientId === 'number' ? clientId : undefined;

  let normalizedClientId: number | undefined;
  if (typeof rawClientId === 'number' && Number.isFinite(rawClientId)) {
    normalizedClientId = rawClientId;
  } else if (typeof rawClientId === 'string' && rawClientId !== '') {
    if (/^\d+$/.test(rawClientId)) {
      const parsed = Number.parseInt(rawClientId, 10);
      if (!Number.isNaN(parsed)) {
        normalizedClientId = parsed;
      }
    }
  }

  return { email: normalizedEmail, clientId: normalizedClientId };
}

export async function requestPasswordReset(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { email, clientId } = normalizeIdentifiers(req.body as IdentifierPayload);
  try {
    let user: { id: number; email: string; table: 'staff' | 'volunteers' | 'clients' } | null = null;

    if (email) {
      const result = await findUserByEmail(email);
      if (result) {
        user = {
          id: result.id,
          email: result.email,
          table: result.userType,
        };
      }
    } else if (clientId !== undefined) {
      const userRes = await pool.query('SELECT client_id, email FROM clients WHERE client_id=$1', [clientId]);
      if ((userRes.rowCount ?? 0) > 0) {
        user = {
          id: userRes.rows[0].client_id,
          email: userRes.rows[0].email,
          table: 'clients',
        };
      }
    }

    if (user) {
      if (typeof user.email === 'string' && user.email.trim() !== '') {
        const token = await generatePasswordSetupToken(user.table, user.id);
        const params = buildPasswordSetupEmailParams(
          user.table,
          token,
          user.table === 'clients' ? user.id : undefined,
        );
        await sendTemplatedEmail({
          to: user.email,
          templateId: config.passwordSetupTemplateId,
          params,
        });
        logger.info(`Password reset requested for ${user.email}`);
      } else {
        logger.warn(
          `Password reset requested for user without email (id=${user.id}, table=${user.table})`,
        );
      }
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function resendPasswordSetup(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { email, clientId } = normalizeIdentifiers(req.body as IdentifierPayload);
  if (!email && clientId === undefined) {
    return res.status(400).json({ message: 'Email or clientId required' });
  }
  try {
    const key = email ?? (clientId !== undefined ? String(clientId) : undefined);
    if (key && resendLimit.has(key)) {
      return res.status(429).json({ message: 'Too many requests' });
    }
    if (key) {
      resendLimit.set(
        key,
        setTimeout(() => resendLimit.delete(key), RESEND_WINDOW_MS),
      );
    }

    let user: { id: number; email: string; table: 'staff' | 'volunteers' | 'clients' } | null = null;
    if (email) {
      const result = await findUserByEmail(email);
      if (result) {
        user = {
          id: result.id,
          email: result.email,
          table: result.userType,
        };
      }
    } else if (clientId !== undefined) {
      const userRes = await pool.query('SELECT client_id, email FROM clients WHERE client_id=$1', [clientId]);
      if ((userRes.rowCount ?? 0) > 0) {
        user = {
          id: userRes.rows[0].client_id,
          email: userRes.rows[0].email,
          table: 'clients',
        };
      }
    }

    if (user) {
      if (typeof user.email === 'string' && user.email.trim() !== '') {
        const token = await generatePasswordSetupToken(user.table, user.id);
        const params = buildPasswordSetupEmailParams(
          user.table,
          token,
          user.table === 'clients' ? user.id : undefined,
        );
        await sendTemplatedEmail({
          to: user.email,
          templateId: config.passwordSetupTemplateId,
          params,
        });
        logger.info(`Password setup link resent for ${user.email}`);
      } else {
        logger.warn(
          `Password setup link requested for user without email (id=${user.id}, table=${user.table})`,
        );
      }
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getPasswordSetupInfo(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.query.token as string | undefined;
  if (!token) {
    return res.status(400).json({ message: 'Missing token' });
  }
  try {
    const row = await verifyPasswordSetupToken(token);
    if (!row) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    let info: { userType: string; clientId?: number; email?: string };
    switch (row.user_type) {
      case 'clients': {
        const result = await pool.query(
          'SELECT client_id FROM clients WHERE client_id=$1',
          [row.user_id],
        );
        if ((result.rowCount ?? 0) === 0) {
          return res
            .status(400)
            .json({ message: 'Invalid or expired token' });
        }
        info = { userType: 'client', clientId: result.rows[0].client_id };
        break;
      }
      case 'staff': {
        const result = await pool.query('SELECT email FROM staff WHERE id=$1', [
          row.user_id,
        ]);
        if ((result.rowCount ?? 0) === 0) {
          return res
            .status(400)
            .json({ message: 'Invalid or expired token' });
        }
        info = { userType: 'staff', email: result.rows[0].email };
        break;
      }
      case 'volunteers': {
        const result = await pool.query(
          'SELECT email FROM volunteers WHERE id=$1',
          [row.user_id],
        );
        if ((result.rowCount ?? 0) === 0) {
          return res
            .status(400)
            .json({ message: 'Invalid or expired token' });
        }
        info = { userType: 'volunteer', email: result.rows[0].email };
        break;
      }
      default:
        return res
          .status(400)
          .json({ message: 'Invalid or expired token' });
    }
    res.json(info);
  } catch (err) {
    next(err);
  }
}

export async function setPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { token, password } = req.body as {
    token?: string;
    password?: string;
  };
  if (!token || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const pwError = validatePassword(password);
  if (pwError) {
    return res.status(400).json({ message: pwError });
  }
  try {
    const row = await verifyPasswordSetupToken(token);
    if (!row) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    const hash = await bcrypt.hash(password, 10);
    const idColumn = row.user_type === 'clients' ? 'client_id' : 'id';
    await pool.query(
      `UPDATE ${row.user_type} SET password=$1 WHERE ${idColumn}=$2`,
      [hash, row.user_id],
    );
    await markPasswordTokenUsed(row.id);
    const loginPathMap: Record<'staff' | 'volunteers' | 'clients', string> = {
      staff: '/login/staff',
      volunteers: '/login/volunteer',
      clients: '/login/user',
    };
    res.json({ loginPath: loginPathMap[row.user_type as 'staff' | 'volunteers' | 'clients'] });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const pwError = validatePassword(newPassword);
  if (pwError) {
    return res.status(400).json({ message: pwError });
  }
  try {
    const mapping = TABLE_MAP[user.type as keyof typeof TABLE_MAP];
    if (!mapping) {
      return res.status(400).json({ message: 'Invalid user type' });
    }
    const { table, idColumn } = mapping;
    const result = await pool.query(
      `SELECT password FROM ${table} WHERE ${idColumn}=$1`,
      [user.id],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const match = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!match) {
      return res.status(400).json({ message: 'Current password incorrect' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE ${table} SET password=$1 WHERE ${idColumn}=$2`,
      [hash, user.id],
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function getRefreshTokenFromCookies(req: Request) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const cookies = cookie.parse(header);
  return cookies.refreshToken;
}

export async function refreshToken(req: Request, res: Response, _next: NextFunction) {
  const cookieOptions = getCookieOptions(req.get('user-agent'));
  try {
    const token = getRefreshTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ message: 'Missing refresh token' });
    }
    const payload = jwt.verify(token, config.jwtRefreshSecret, {
      algorithms: ['HS256'],
    }) as {
      id: number | string;
      role: string;
      type: string;
      jti: string;
      userId?: number | string;
      userRole?: string;
      access?: string[];
    };
    if (!payload.jti) {
      throw new Error('Invalid refresh token');
    }
    const subject = `${payload.type}:${payload.id}`;
    const stored = await pool.query(
      'SELECT subject, expires_at FROM refresh_tokens WHERE token_id=$1',
      [payload.jti],
    );
    if ((stored.rowCount ?? 0) === 0) {
      logger.warn('Refresh token not found for %s', subject);
      throw new Error('Invalid refresh token');
    }
    const tokenRecord = stored.rows[0] as {
      subject: string;
      expires_at: string | Date;
    };
    if (tokenRecord.subject !== subject) {
      logger.warn('Refresh token subject mismatch for %s', subject);
      throw new Error('Invalid refresh token');
    }
    const expiresAt =
      tokenRecord.expires_at instanceof Date
        ? tokenRecord.expires_at
        : new Date(tokenRecord.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      logger.warn('Refresh token expired for %s', subject);
      throw new Error('Invalid refresh token');
    }
    const refreshExpiryMs = getRefreshExpiryMs();
    const newExpiresAt = new Date(Date.now() + refreshExpiryMs);
    const newJti = randomUUID();
    await pool.query(
      `UPDATE refresh_tokens SET token_id=$1, expires_at=$2 WHERE token_id=$3`,
      [newJti, newExpiresAt, payload.jti],
    );
    const basePayload: any = {
      id: payload.id,
      role: payload.role,
      type: payload.type,
    };
    if (payload.userId) basePayload.userId = payload.userId;
    if (payload.userRole) basePayload.userRole = payload.userRole;
    if (payload.access) basePayload.access = payload.access;

    const accessToken = jwt.sign(basePayload, config.jwtSecret, {
      expiresIn: '1h',
      algorithm: 'HS256',
    });
    const newRefreshToken = jwt.sign(
      { ...basePayload, jti: newJti },
      config.jwtRefreshSecret,
      { expiresIn: Math.floor(refreshExpiryMs / 1000), algorithm: 'HS256' },
    );
    res.cookie('token', accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });
    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: refreshExpiryMs,
      expires: newExpiresAt,
    });
    return res.status(204).send();
  } catch (err) {
    logger.warn('Invalid refresh token');
    res.clearCookie('token', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  const cookieOptions = getCookieOptions(req.get('user-agent'));
  try {
    const token = getRefreshTokenFromCookies(req);
    if (token) {
      try {
        const payload = jwt.verify(token, config.jwtRefreshSecret, {
          algorithms: ['HS256'],
        }) as {
          id: number | string;
          type: string;
          jti?: string;
        };
        if (payload.jti) {
          await pool.query('DELETE FROM refresh_tokens WHERE token_id=$1', [payload.jti]);
        }
      } catch {
        // ignore
      }
    }
    res.clearCookie('token', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export function csrfToken(_req: Request, res: Response) {
  const token = randomUUID();
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('csrfToken', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
    maxAge: 60 * 60 * 1000,
    ...(secure && config.cookieDomain ? { domain: config.cookieDomain } : {}),
  });
  res.json({ csrfToken: token });
}
