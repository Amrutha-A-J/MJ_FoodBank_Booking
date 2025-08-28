import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../src/db');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../src/utils/bookingUtils', () => ({}));

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/users/register', () => {
  it('registers a user with valid data', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, online_access: false, role: 'shopper' }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ email: 'jane@example.com', otp_hash: 'hash', expires_at: new Date(Date.now() + 60_000).toISOString() }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, role: 'shopper', first_name: 'Jane', last_name: 'Doe' }] })
      .mockResolvedValueOnce({});
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app).post('/api/users/register').send({
      clientId: 123,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '123',
      password: 'Secret1!',
      otp: '123456',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'shopper', name: 'Jane Doe' });
  });

  it('rejects duplicate registration attempts', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, online_access: true, role: 'shopper' }],
    });

    const res = await request(app).post('/api/users/register').send({
      clientId: 123,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Secret1!',
      otp: '123456',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid otp', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, online_access: false, role: 'shopper' }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ email: 'jane@example.com', otp_hash: 'hash', expires_at: new Date(Date.now() + 60_000).toISOString() }],
      });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app).post('/api/users/register').send({
      clientId: 123,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Secret1!',
      otp: '123456',
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid OTP' });
  });

  it('rejects weak passwords', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, online_access: false, role: 'shopper' }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ email: 'jane@example.com', otp_hash: 'hash', expires_at: new Date(Date.now() + 60_000).toISOString() }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app).post('/api/users/register').send({
      clientId: 123,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'weak',
      otp: '123456',
    });
    expect(res.status).toBe(400);
  });
});

