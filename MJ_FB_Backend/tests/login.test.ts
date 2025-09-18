import request from 'supertest';
import express from 'express';
jest.mock('express-rate-limit', () => ({
  rateLimit: () => {
    const fn: any = (_req: any, _res: any, next: any) => next();
    fn.resetKey = jest.fn();
    return fn;
  },
}));
import usersRouter from '../src/routes/users';
import authRouter, { authLimiter } from '../src/routes/auth';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../src/utils/bookingUtils', () => ({
}));

const volunteerWithShopper = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  password: 'hashed',
  user_id: 9,
  user_role: 'shopper',
  consent: false,
};

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
  authLimiter.resetKey('::ffff:127.0.0.1');
  authLimiter.resetKey('127.0.0.1');
  authLimiter.resetKey('::1');
  (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] });
});

describe('POST /api/v1/auth/login', () => {
  it('returns 400 when missing credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('logs in staff with valid credentials', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            password: 'hashed',
            role: 'staff',
            access: [],
            consent: false,
          },
        ],
      });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john@example.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('role', 'staff');
    expect((pool.query as jest.Mock).mock.calls[2][0]).toMatch(/WHERE LOWER\(email\) = LOWER\(\$1\)/);
  });

  it('normalizes mixed-case emails before lookup', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            password: 'hashed',
            role: 'staff',
            access: [],
            consent: false,
          },
        ],
      });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'JoHn@Example.COM', password: 'secret' });

    expect(res.status).toBe(200);
    expect((pool.query as jest.Mock).mock.calls[1][1][0]).toBe('john@example.com');
    expect((pool.query as jest.Mock).mock.calls[2][1][0]).toBe('john@example.com');
  });

  it('allows volunteers to log in with mixed-case emails', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [volunteerWithShopper] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'JoHn@Example.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: 'volunteer',
      name: 'John Doe',
      userRole: 'shopper',
      access: [],
      id: 1,
      consent: false,
    });
    expect((pool.query as jest.Mock).mock.calls[1][0]).toMatch(
      /WHERE LOWER\(v.email\) = LOWER\(\$1\)/,
    );
    expect((pool.query as jest.Mock).mock.calls[1][1][0]).toBe('john@example.com');
  });

  it('allows clients to log in with mixed-case emails', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            client_id: 4,
            first_name: 'Client',
            last_name: 'User',
            role: 'shopper',
            password: 'hashed',
            consent: true,
          },
        ],
      });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ClIeNt@Example.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: 'shopper',
      name: 'Client User',
      id: 4,
    });
    expect((pool.query as jest.Mock).mock.calls[3][0]).toMatch(
      /WHERE LOWER\(email\) = LOWER\(\$1\) AND online_access = true/,
    );
    expect((pool.query as jest.Mock).mock.calls[3][1][0]).toBe('client@example.com');
  });

  it('logs in volunteer with shopper profile and returns both roles', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [volunteerWithShopper] });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: volunteerWithShopper.email, password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: 'volunteer',
      name: 'John Doe',
      userRole: 'shopper',
      access: [],
      id: 1,
      consent: false,
    });
    expect((pool.query as jest.Mock).mock.calls[1][0]).toMatch(/WHERE LOWER\(v.email\) = LOWER\(\$1\)/);
    expect((jwt.sign as jest.Mock).mock.calls[0][0]).toMatchObject({
      id: 1,
      role: 'volunteer',
      type: 'volunteer',
      userId: volunteerWithShopper.user_id,
      userRole: 'shopper',
    });
  });

  it('logs in volunteer via client ID and returns both roles', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            client_id: 9,
            first_name: 'John',
            last_name: 'Doe',
            role: 'shopper',
            password: 'hashed',
            consent: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'John', last_name: 'Doe', consent: false }],
      });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ clientId: 9, password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: 'volunteer',
      name: 'John Doe',
      userRole: 'shopper',
      access: [],
      id: 1,
      consent: false,
    });
    expect((pool.query as jest.Mock).mock.calls[1][0]).toMatch(/WHERE client_id = \$1/);
    expect((pool.query as jest.Mock).mock.calls[2][0]).toMatch(/FROM volunteers WHERE user_id = \$1/);
    expect((jwt.sign as jest.Mock).mock.calls[0][0]).toMatchObject({
      id: 1,
      role: 'volunteer',
      type: 'volunteer',
      userId: 9,
      userRole: 'shopper',
    });
  });

  it('returns 401 with invalid credentials', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'false' }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ email: 'john@example.com', password: 'hashed', consent: false }],
      });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('returns 404 when account is not found', async () => {
    authLimiter.resetKey('::ffff:127.0.0.1');
    authLimiter.resetKey('127.0.0.1');
    authLimiter.resetKey('::1');
    authLimiter.resetKey('1.1.1.1');
    authLimiter.resetKey('::ffff:1.1.1.1');
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '1.1.1.1')
      .send({ email: 'missing@example.com', password: 'secret' });
    expect(res.status).toBe(404);
  });

  it('blocks non-staff login during maintenance', async () => {
    authLimiter.resetKey('::ffff:127.0.0.1');
    authLimiter.resetKey('127.0.0.1');
    authLimiter.resetKey('::1');
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ value: 'true' }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [volunteerWithShopper],
      });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: volunteerWithShopper.email, password: 'secret' });

    expect(res.status).toBe(503);
  });
});

describe('GET /api/v1/users/me', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });
});
