import request from 'supertest';
import express from 'express';
import authRouter from '../src/routes/auth';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

const app = express();
app.use('/auth', authRouter);

describe('POST /auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears auth cookies', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(204);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.startsWith('token=;'))).toBe(true);
    expect(cookies.some(c => c.startsWith('refreshToken=;'))).toBe(true);
  });

  it('removes the stored refresh token when provided', async () => {
    const refreshToken = jwt.sign(
      { id: 1, type: 'user', jti: 'logout-jti' },
      process.env.JWT_REFRESH_SECRET!,
      { algorithm: 'HS256' },
    );
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(204);
    expect(pool.query).toHaveBeenCalledWith(
      'DELETE FROM refresh_tokens WHERE token_id=$1',
      ['logout-jti'],
    );
  });
});
