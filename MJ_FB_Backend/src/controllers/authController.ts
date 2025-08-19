import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';

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
    if (email) {
      const staffRes = await pool.query('SELECT id FROM staff WHERE email=$1', [email]);
      const volRes = await pool.query('SELECT id FROM volunteers WHERE email=$1', [email]);
      if (staffRes.rowCount || volRes.rowCount) {
        logger.info(`Password reset requested for ${email}`);
      }
    } else if (username) {
      const volRes = await pool.query('SELECT id FROM volunteers WHERE username=$1', [username]);
      if (volRes.rowCount) {
        logger.info(`Password reset requested for volunteer ${username}`);
      }
    } else if (clientId) {
      const userRes = await pool.query('SELECT id FROM users WHERE client_id=$1', [clientId]);
      if (userRes.rowCount) {
        logger.info(`Password reset requested for client ${clientId}`);
      }
    }
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
  try {
    let table = 'users';
    if (user.type === 'staff') table = 'staff';
    else if (user.type === 'volunteer') table = 'volunteers';
    const result = await pool.query(
      `SELECT password FROM ${table} WHERE id=$1`,
      [user.id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const match = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!match) {
      return res.status(400).json({ message: 'Current password incorrect' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE ${table} SET password=$1 WHERE id=$2`, [hash, user.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function getRefreshTokenFromCookies(req: Request) {
  const cookie = req.headers.cookie;
  if (!cookie) return undefined;
  const cookies = Object.fromEntries(
    cookie.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    }),
  );
  return cookies.refreshToken;
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getRefreshTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ message: 'Missing refresh token' });
    }
    const payload = jwt.verify(token, config.jwtSecret) as {
      id: number | string;
      role: string;
      type: string;
    };
    const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
    const newRefreshToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: '7d',
    });
    res.cookie('token', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
      secure: process.env.NODE_ENV !== 'development',
    });
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV !== 'development',
    });
    return res.json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    logger.warn('Invalid refresh token');
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}
