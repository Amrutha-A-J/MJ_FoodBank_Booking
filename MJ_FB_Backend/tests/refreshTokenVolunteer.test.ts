import request from 'supertest';
import express from 'express';
import authRouter from '../src/routes/auth';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

const app = express();
app.use('/auth', authRouter);

describe('POST /auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves volunteer user fields when refreshing token', async () => {
    const payload = {
      id: 1,
      role: 'volunteer',
      type: 'volunteer',
      userId: 9,
      userRole: 'shopper',
      jti: 'oldjti',
    };
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });
    const future = new Date(Date.now() + 60_000).toISOString();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ subject: 'volunteer:1', expires_at: future }],
      })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(204);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    const accessCookie = cookies.find(c => c.startsWith('token='));
    const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
    const accessToken = accessCookie!.split('token=')[1].split(';')[0];
    const newRefreshToken = refreshCookie!.split('refreshToken=')[1].split(';')[0];
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as any;
    expect(decoded.userId).toBe(9);
    expect(decoded.userRole).toBe('shopper');
    const decodedRefresh = jwt.verify(newRefreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    expect(decodedRefresh.userId).toBe(9);
    expect(decodedRefresh.userRole).toBe('shopper');

    expect((pool.query as jest.Mock).mock.calls[0][0]).toContain('WHERE token_id=$1');
    expect((pool.query as jest.Mock).mock.calls[0][1]).toEqual(['oldjti']);
    expect((pool.query as jest.Mock).mock.calls[1][0]).toContain(
      'UPDATE refresh_tokens SET token_id=$1, expires_at=$2 WHERE token_id=$3',
    );
    expect((pool.query as jest.Mock).mock.calls[1][1][2]).toBe('oldjti');
  });

  it('rejects expired refresh tokens', async () => {
    const payload = {
      id: 1,
      role: 'volunteer',
      type: 'volunteer',
      jti: 'expired',
    };
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });
    const past = new Date(Date.now() - 60_000).toISOString();
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ subject: 'volunteer:1', expires_at: past }],
    });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(401);
    expect((pool.query as jest.Mock).mock.calls).toHaveLength(1);
  });
});
