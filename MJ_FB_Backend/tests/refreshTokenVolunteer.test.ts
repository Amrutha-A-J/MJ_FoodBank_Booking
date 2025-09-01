import '../tests/utils/mockDb';
import request from 'supertest';
import express from 'express';
import authRouter from '../src/routes/auth';
import pool from '../src/db';
import jwt from 'jsonwebtoken';


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
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      algorithm: 'HS256',
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ token_id: 'oldjti' }] })
      .mockResolvedValueOnce({});

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
    });
  });
