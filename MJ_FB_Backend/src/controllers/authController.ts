import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';
import { validatePassword } from '../utils/passwordUtils';
import cookie from 'cookie';
import { cookieOptions } from '../utils/authUtils';
import {
  generatePasswordSetupToken,
  verifyPasswordSetupToken,
  markPasswordTokenUsed,
} from '../utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../utils/emailUtils';

export async function requestPasswordReset(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { email, username, clientId } = req.body as {
    email?: string;
    username?: string;
    clientId?: number;
  };
  try {
    let user: { id: number; email: string; table: 'staff' | 'volunteers' | 'clients' | 'agencies' } | null = null;

    if (email) {
      const result = await pool.query(
        `SELECT id, email, user_type FROM (
          SELECT id, email, 'staff' AS user_type, 1 AS ord FROM staff WHERE email=$1
          UNION ALL
          SELECT id, email, 'volunteers' AS user_type, 2 AS ord FROM volunteers WHERE email=$1
          UNION ALL
          SELECT id, email, 'agencies' AS user_type, 3 AS ord FROM agencies WHERE email=$1
          UNION ALL
          SELECT client_id AS id, email, 'clients' AS user_type, 4 AS ord FROM clients WHERE email=$1
        ) AS combined
        ORDER BY ord
        LIMIT 1`,
        [email],
      );
      if ((result.rowCount ?? 0) > 0) {
        user = {
          id: result.rows[0].id,
          email: result.rows[0].email,
          table: result.rows[0].user_type,
        };
      }
    } else if (username) {
      const volRes = await pool.query('SELECT id, email FROM volunteers WHERE username=$1', [username]);
      if ((volRes.rowCount ?? 0) > 0) {
        user = {
          id: volRes.rows[0].id,
          email: volRes.rows[0].email,
          table: 'volunteers',
        };
      }
    } else if (clientId) {
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
      const token = await generatePasswordSetupToken(user.table, user.id);
      await sendTemplatedEmail({
        to: user.email,
        templateId: 1,
        params: {
          link: `${config.frontendOrigins[0]}/set-password?token=${token}`,
        },
      });
      logger.info(`Password reset requested for ${user.email}`);
    }
    res.status(204).send();
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
    res.status(204).send();
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
  const user = req.user as any;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const pwError = validatePassword(newPassword);
  if (pwError) {
    return res.status(400).json({ message: pwError });
  }
  try {
    let table = 'clients';
    if (user.type === 'staff') table = 'staff';
    else if (user.type === 'volunteer') table = 'volunteers';
    else if (user.type === 'agency') table = 'agencies';
    const idColumn = table === 'clients' ? 'client_id' : 'id';
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

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getRefreshTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ message: 'Missing refresh token' });
    }
    const payload = jwt.verify(token, config.jwtRefreshSecret) as {
      id: number | string;
      role: string;
      type: string;
      jti: string;
      userId?: number | string;
      userRole?: string;
      access?: string[];
    };
    const subject = `${payload.type}:${payload.id}`;
    const stored = await pool.query(
      'SELECT token_id FROM refresh_tokens WHERE subject=$1',
      [subject],
    );
    if ((stored.rowCount ?? 0) === 0) {
      throw new Error('Invalid refresh token');
    }
    if (stored.rows[0].token_id !== payload.jti) {
      // Token subject exists but jti mismatch – likely another request refreshed already.
      logger.warn('Refresh token jti mismatch for %s', subject);
      return res.status(409).send();
    }
    const newJti = randomUUID();
    await pool.query(
      `UPDATE refresh_tokens SET token_id=$1 WHERE subject=$2`,
      [newJti, subject],
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
    });
    const newRefreshToken = jwt.sign(
      { ...basePayload, jti: newJti },
      config.jwtRefreshSecret,
      { expiresIn: '7d' },
    );
    const refreshExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
    res.cookie('token', accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });
    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: refreshExpiry,
      expires: new Date(Date.now() + refreshExpiry),
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
  try {
    const token = getRefreshTokenFromCookies(req);
    if (token) {
      try {
        const payload = jwt.verify(token, config.jwtRefreshSecret) as {
          id: number | string;
          type: string;
        };
        await pool.query('DELETE FROM refresh_tokens WHERE subject=$1', [
          `${payload.type}:${payload.id}`,
        ]);
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
    sameSite: 'strict',
    secure,
    path: '/',
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  });
  res.json({ csrfToken: token });
}
