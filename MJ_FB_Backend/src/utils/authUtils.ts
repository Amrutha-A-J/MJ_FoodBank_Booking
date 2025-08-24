import { Response } from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db';
import config from '../config';
import type { StaffAccess } from '../models/staff';

export type AuthPayload = {
  id: number;
  role: string;
  type: 'user' | 'staff';
  access?: StaffAccess[];
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

  const secure = process.env.NODE_ENV !== 'development';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000,
    secure,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure,
  });
}

export default issueAuthTokens;
