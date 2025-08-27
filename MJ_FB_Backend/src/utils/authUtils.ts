import { Response, CookieOptions } from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db';
import config from '../config';

const secure = process.env.NODE_ENV !== 'development';

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure,
  path: '/',
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

export type AuthPayload = {
  id: number;
  role: string;
  /**
   * The category of user these tokens are for. Volunteers use the same
   * refresh-token flow as users, staff and agencies so include them here.
   */
  type: 'user' | 'staff' | 'agency' | 'volunteer';
  access?: string[];
  /** Optional fields used for volunteer/user hybrids */
  userId?: number;
  userRole?: string;
};

/**
 * Generates auth and refresh tokens, persists the refresh token, and sets the
 * appropriate cookies on the response object.
 */
export async function issueAuthTokens(
  res: Response,
  payload: AuthPayload,
  subject: string,
) {
  const jti = randomUUID();
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ ...payload, jti }, config.jwtRefreshSecret, {
    expiresIn: '7d',
  });

  await pool.query(
    `INSERT INTO refresh_tokens (token_id, subject) VALUES ($1,$2)
     ON CONFLICT (subject) DO UPDATE SET token_id = EXCLUDED.token_id`,
    [jti, subject],
  );

  const refreshExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
  res.cookie('token', token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: refreshExpiry,
    expires: new Date(Date.now() + refreshExpiry),
  });

  return { token, refreshToken };
}

export default issueAuthTokens;
