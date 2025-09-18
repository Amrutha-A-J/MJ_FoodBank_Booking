import request from 'supertest';
import express from 'express';
import donationsRoutes from '../src/routes/warehouse/donations';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const app = express();
app.use('/donations', donationsRoutes);
const year = new Date().getFullYear();

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

const authRow = {
  id: 1,
  first_name: 'Test',
  last_name: 'User',
  email: 't@example.com',
  role: 'staff',
};

describe('GET /donations/aggregations', () => {
  it('includes donors with zero yearly donations', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse'] });
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const rows = [
      ...months.map(month => ({
        donorId: 1,
        donor: 'Alice',
        email: 'alice@example.com',
        phone: '306-555-1000',
        month,
        total: month === 1 ? 100 : month === 2 ? 50 : 0,
      })),
      ...months.map(month => ({
        donorId: 2,
        donor: 'Bob',
        email: 'bob@example.com',
        phone: null,
        month,
        total: 0,
      })),
    ];

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rows });

    const res = await request(app)
      .get(`/donations/aggregations?year=${year}`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
      [1],
    );
    expect(res.body).toEqual([
      {
        donorId: 1,
        donor: 'Alice',
        email: 'alice@example.com',
        phone: '306-555-1000',
        monthlyTotals: [100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        total: 150,
      },
      {
        donorId: 2,
        donor: 'Bob',
        email: 'bob@example.com',
        phone: null,
        monthlyTotals: Array(12).fill(0),
        total: 0,
      },
    ]);
  });
});
