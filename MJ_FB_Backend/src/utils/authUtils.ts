import { Response, CookieOptions } from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db';
import config from '../config';

// Use HTTPS cookies in production; allow HTTP cookies in development.
// sameSite is set to 'none' when secure (for cross-site usage) and 'lax' otherwise.
const isProduction = process.env.NODE_ENV === 'production';

// Options applied to auth cookies across the app. Cookies are scoped to the
// root path and optionally to a specific domain via the COOKIE_DOMAIN env var.
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
  path: '/',
  ...(isProduction && config.cookieDomain ? { domain: config.cookieDomain } : {}),
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
  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
  const refreshToken = jwt.sign({ ...payload, jti }, config.jwtRefreshSecret, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });

  const refreshExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
  const refreshExpiresAt = new Date(Date.now() + refreshExpiry);

  await pool.query(
    `INSERT INTO refresh_tokens (token_id, subject, expires_at) VALUES ($1,$2,$3)`,
    [jti, subject, refreshExpiresAt],
  );

  res.cookie('token', token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: refreshExpiry,
    expires: refreshExpiresAt,
  });

  return { token, refreshToken };
}

export default issueAuthTokens;
