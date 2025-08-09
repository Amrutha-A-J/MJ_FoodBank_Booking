import request from 'supertest';
import express from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../src/middleware/authMiddleware';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('../src/db');
jest.mock('jsonwebtoken');

const app = express();
app.get('/protected', authMiddleware, (_req, res) => res.json({ ok: true }));
app.get('/optional', optionalAuthMiddleware, (req, res) =>
  res.json({ ok: true, user: req.user || null }),
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authMiddleware', () => {
  it('allows access with valid token', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: 1,
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          role: 'shopper',
          phone: '123',
        },
      ],
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
  });

  it('rejects missing token', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Missing token');
  });

  it('rejects invalid token', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid');
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });
});

describe('optionalAuthMiddleware', () => {
  it('allows access and sets user with valid token', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 2, role: 'shopper', type: 'user' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: 2,
          first_name: 'Opt',
          last_name: 'User',
          email: 'opt@example.com',
          role: 'shopper',
          phone: '456',
        },
      ],
    });

    const res = await request(app)
      .get('/optional')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body.user).not.toBeNull();
  });

  it('allows access without token', async () => {
    const res = await request(app).get('/optional');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('rejects invalid token', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid');
    });

    const res = await request(app)
      .get('/optional')
      .set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });
});

