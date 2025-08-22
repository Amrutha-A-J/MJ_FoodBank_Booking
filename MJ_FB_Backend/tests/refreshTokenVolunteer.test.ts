import request from 'supertest';
import express from 'express';
import authRouter from '../src/routes/auth';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('../src/db');

const app = express();
app.use('/auth', authRouter);

describe('POST /auth/refresh', () => {
  it('preserves volunteer user fields when refreshing token', async () => {
    const payload = {
      id: 1,
      role: 'volunteer',
      type: 'volunteer',
      userId: 9,
      userRole: 'shopper',
      jti: 'oldjti',
    };
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ token_id: 'oldjti' }] })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET!) as any;
    expect(decoded.userId).toBe(9);
    expect(decoded.userRole).toBe('shopper');
    const decodedRefresh = jwt.verify(res.body.refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    expect(decodedRefresh.userId).toBe(9);
    expect(decodedRefresh.userRole).toBe('shopper');
  });
});
