import issueAuthTokens, { cookieOptions } from '../src/utils/authUtils';
import pool from '../src/db';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { randomUUID } from 'crypto';

jest.mock('../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn() }));
jest.mock('crypto', () => ({ randomUUID: jest.fn(() => 'uuid-1') }));

describe('cookieOptions', () => {
  it('enables secure cookies with a domain in production', async () => {
    const configModulePath = '../src/config';
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      await jest.isolateModulesAsync(async () => {
        process.env.NODE_ENV = 'production';

        jest.doMock(configModulePath, () => ({
          __esModule: true,
          default: { cookieDomain: 'auth.moosejawfoodbank.test' },
        }));

        const { cookieOptions: productionCookieOptions } = await import('../src/utils/authUtils');

        expect(productionCookieOptions.sameSite).toBe('none');
        expect(productionCookieOptions.secure).toBe(true);
        expect(productionCookieOptions).toEqual(
          expect.objectContaining({ domain: 'auth.moosejawfoodbank.test' }),
        );
      });
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      jest.dontMock(configModulePath);
      jest.resetModules();
    }
  });
});

describe('issueAuthTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (randomUUID as unknown as jest.Mock).mockReset();
    (randomUUID as unknown as jest.Mock).mockReturnValue('uuid-1');
  });

  it('persists refresh token id and sets cookies', async () => {
    (jwt.sign as jest.Mock)
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const res = { cookie: jest.fn() } as unknown as Response;

    const result = await issueAuthTokens(
      res,
      { id: 1, role: 'user', type: 'user' },
      'user:1',
    );

    expect(result).toEqual({ token: 'access-token', refreshToken: 'refresh-token' });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO refresh_tokens'),
      ['uuid-1', 'user:1', expect.any(Date)],
    );

    const refreshExpiry = 7 * 24 * 60 * 60 * 1000;

    expect(res.cookie).toHaveBeenNthCalledWith(
      1,
      'token',
      'access-token',
      { ...cookieOptions, maxAge: 60 * 60 * 1000 },
    );

    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      'refreshToken',
      'refresh-token',
      {
        ...cookieOptions,
        maxAge: refreshExpiry,
        expires: expect.any(Date),
      },
    );
  });

  it('stores each refresh token separately for simultaneous logins', async () => {
    (jwt.sign as jest.Mock)
      .mockReturnValueOnce('access-token-1')
      .mockReturnValueOnce('refresh-token-1')
      .mockReturnValueOnce('access-token-2')
      .mockReturnValueOnce('refresh-token-2');

    (randomUUID as unknown as jest.Mock)
      .mockReturnValueOnce('uuid-1')
      .mockReturnValueOnce('uuid-2');

    const firstRes = { cookie: jest.fn() } as unknown as Response;
    await issueAuthTokens(firstRes, { id: 1, role: 'user', type: 'user' }, 'user:1');

    const secondRes = { cookie: jest.fn() } as unknown as Response;
    await issueAuthTokens(secondRes, { id: 1, role: 'user', type: 'user' }, 'user:1');

    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO refresh_tokens'),
      ['uuid-1', 'user:1', expect.any(Date)],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO refresh_tokens'),
      ['uuid-2', 'user:1', expect.any(Date)],
    );
    expect((pool.query as jest.Mock).mock.calls[0][0]).not.toMatch(/ON CONFLICT/i);
    expect((pool.query as jest.Mock).mock.calls[1][0]).not.toMatch(/ON CONFLICT/i);
  });
});
