import issueAuthTokens, { cookieOptions } from '../src/utils/authUtils';
import pool from '../src/db';
import jwt from 'jsonwebtoken';
import { Response } from 'express';

jest.mock('../src/db', () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn() }));
jest.mock('crypto', () => ({ randomUUID: jest.fn(() => 'uuid-1') }));

describe('issueAuthTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      ['uuid-1', 'user:1'],
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
});
