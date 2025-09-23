import request from 'supertest';
import express from 'express';
import authRouter from '../src/routes/auth';
import pool from '../src/db';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { optionalAuthMiddleware } from '../src/middleware/authMiddleware';

const app = express();
app.use(optionalAuthMiddleware);
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

  it('refreshes tokens when access token is expired but refresh token is valid', async () => {
    const payload = {
      id: 1,
      role: 'volunteer',
      type: 'volunteer',
      userId: 9,
      userRole: 'shopper',
      jti: 'still-valid',
    };
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });
    const expiredAccessToken = 'expiredAccessToken';
    const realVerify = jest.requireActual('jsonwebtoken').verify as typeof jwt.verify;
    const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation(((token: unknown, secret: any, options: any) => {
      if (token === expiredAccessToken) {
        throw new TokenExpiredError('jwt expired', new Date());
      }
      return realVerify(token as string, secret, options);
    }) as typeof jwt.verify);

    const future = new Date(Date.now() + 60_000).toISOString();
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ subject: 'volunteer:1', expires_at: future }],
      })
      .mockResolvedValueOnce({ rowCount: 1 });

    try {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [`token=${expiredAccessToken}`, `refreshToken=${refreshToken}`]);

      expect(res.status).toBe(204);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const newAccessCookie = cookies.find(c => c.startsWith('token=') && !c.startsWith('token=;'));
      const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
      expect(newAccessCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();
      const newAccessToken = newAccessCookie!.split('token=')[1].split(';')[0];
      const newRefreshToken = refreshCookie!.split('refreshToken=')[1].split(';')[0];
      const decodedAccess = realVerify(newAccessToken, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as any;
      expect(decodedAccess.userId).toBe(9);
      expect(decodedAccess.userRole).toBe('shopper');
      const decodedRefresh = realVerify(newRefreshToken, process.env.JWT_REFRESH_SECRET!, {
        algorithms: ['HS256'],
      }) as any;
      expect(decodedRefresh.userId).toBe(9);
      expect(decodedRefresh.userRole).toBe('shopper');
    } finally {
      verifySpy.mockRestore();
    }
  });
});
