import request from 'supertest';
import express from 'express';
import donorsRoutes from '../src/routes/donors';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/donors', donorsRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

const authRow = { id: 1, first_name: 'Test', last_name: 'User', email: 't@example.com', role: 'staff' };

describe('donor routes', () => {
  it.each([
    ['2'],
    ['Alice'],
    ['Smith'],
    ['alice@example.com'],
  ])('lists donors matching %s', async search => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [{ id: 2, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }],
      });
    const res = await request(app)
      .get(`/donors?search=${encodeURIComponent(search)}`)
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
      [1],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      `SELECT id, first_name AS "firstName", last_name AS "lastName", email
       FROM donors
       WHERE CAST(id AS TEXT) ILIKE $1
          OR first_name ILIKE $1
          OR last_name ILIKE $1
          OR email ILIKE $1
       ORDER BY first_name, last_name`,
      [`%${search}%`],
    );
    expect(res.body).toEqual([
      { id: 2, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    ]);
  });

  it('adds a donor', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse', 'donation_entry'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [{ id: 3, firstName: 'Bob', lastName: 'Brown', email: 'bob@example.com' }],
      });
    const res = await request(app)
      .post('/donors')
      .set('Authorization', 'Bearer token')
      .send({ firstName: 'Bob', lastName: 'Brown', email: 'bob@example.com' });
    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
      [1],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO donors (first_name, last_name, email) VALUES ($1, $2, $3) RETURNING id, first_name AS "firstName", last_name AS "lastName", email',
      ['Bob', 'Brown', 'bob@example.com'],
    );
    expect(res.body).toEqual({ id: 3, firstName: 'Bob', lastName: 'Brown', email: 'bob@example.com' });
  });

  it('returns 409 for duplicate donor email', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce({ code: '23505' });
    const res = await request(app)
      .post('/donors')
      .set('Authorization', 'Bearer token')
      .send({ firstName: 'Bob', lastName: 'Brown', email: 'bob@example.com' });
    expect(res.status).toBe(409);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
      [1],
    );
    expect(res.body).toEqual({ message: 'Donor already exists' });
  });

  it('rejects invalid donor payload', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [authRow] });
    const res = await request(app)
      .post('/donors')
      .set('Authorization', 'Bearer token')
      .send({ firstName: '', lastName: '', email: 'bad' });
    expect(res.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when db fails on list', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db failure'));
    const res = await request(app)
      .get('/donors')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
  });

  it('returns 500 when db fails on add', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db failure'));
    const res = await request(app)
      .post('/donors')
      .set('Authorization', 'Bearer token')
      .send({ firstName: 'X', lastName: 'Y', email: 'x@y.com' });
    expect(res.status).toBe(500);
  });
});
