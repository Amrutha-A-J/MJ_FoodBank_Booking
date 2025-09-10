import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import authRouter from '../src/routes/auth';
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
};

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
  (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] });
});

describe('POST /api/auth/login', () => {
  it('returns 400 when missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('logs in staff with valid credentials', async () => {
    (pool.query as jest.Mock)
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
          },
        ],
      });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('role', 'staff');
    expect((pool.query as jest.Mock).mock.calls[1][0]).toMatch(/WHERE email = \$1/);
  });

  it('logs in volunteer with shopper profile and returns both roles', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [volunteerWithShopper],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: volunteerWithShopper.email, password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: 'volunteer',
      name: 'John Doe',
      userRole: 'shopper',
      access: [],
      id: 1,
    });
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/WHERE v.email = \$1/);
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
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            client_id: 9,
            first_name: 'John',
            last_name: 'Doe',
            role: 'shopper',
            password: 'hashed',
          },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }],
      });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ clientId: 9, password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: 'volunteer',
      name: 'John Doe',
      userRole: 'shopper',
      access: [],
      id: 1,
    });
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/WHERE client_id = \$1/);
    expect((pool.query as jest.Mock).mock.calls[1][0]).toMatch(/FROM volunteers WHERE user_id = \$1/);
    expect((jwt.sign as jest.Mock).mock.calls[0][0]).toMatchObject({
      id: 1,
      role: 'volunteer',
      type: 'volunteer',
      userId: 9,
      userRole: 'shopper',
    });
  });

  it('returns 401 with invalid credentials', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ email: 'john@example.com', password: 'hashed' }],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('returns 404 when account is not found', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@example.com', password: 'secret' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/users/me', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});
