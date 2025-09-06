import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../src/utils/bookingUtils', () => ({
}));

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

describe('POST /api/users/login', () => {
  it('returns 400 when missing credentials', async () => {
    const res = await request(app).post('/api/users/login').send({});
    expect(res.status).toBe(400);
  });

  it('logs in staff with valid credentials', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        password: 'hashed',
        role: 'staff',
      }],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'john@example.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('role', 'staff');
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/WHERE email = \$1/);
  });

  it('returns 401 with invalid credentials', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ email: 'john@example.com', password: 'hashed' }],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'john@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/me', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});
