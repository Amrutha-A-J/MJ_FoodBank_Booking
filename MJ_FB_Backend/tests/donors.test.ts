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
  it('lists donors matching search', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse', 'donation_entry'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [{ id: 2, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }],
      });
    const res = await request(app).get('/donors?search=ali').set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      `SELECT id, first_name AS "firstName", last_name AS "lastName", email
       FROM donors
       WHERE CAST(id AS TEXT) ILIKE $1
          OR first_name ILIKE $1
          OR last_name ILIKE $1
          OR email ILIKE $1
       ORDER BY first_name, last_name`,
      ['%ali%'],
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
      2,
      'INSERT INTO donors (first_name, last_name, email) VALUES ($1, $2, $3) RETURNING id, first_name AS "firstName", last_name AS "lastName", email',
      ['Bob', 'Brown', 'bob@example.com'],
    );
    expect(res.body).toEqual({ id: 3, firstName: 'Bob', lastName: 'Brown', email: 'bob@example.com' });
  });
});
