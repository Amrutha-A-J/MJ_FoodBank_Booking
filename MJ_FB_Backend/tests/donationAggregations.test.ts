import request from 'supertest';
import express from 'express';
import donationsRoutes from '../src/routes/warehouse/donations';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('../src/db');
jest.mock('jsonwebtoken');

const app = express();
app.use('/donations', donationsRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /donations/aggregations', () => {
  it('includes donors with zero yearly donations', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse'] });
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const rows = [
      ...months.map(month => ({ donor: 'Alice', month, total: month === 1 ? 100 : month === 2 ? 50 : 0 })),
      ...months.map(month => ({ donor: 'Bob', month, total: 0 })),
    ];

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 't@example.com', role: 'staff' }],
      })
      .mockResolvedValueOnce({ rows });

    const res = await request(app)
      .get('/donations/aggregations?year=2024')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { donor: 'Alice', monthlyTotals: [100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 150 },
      { donor: 'Bob', monthlyTotals: Array(12).fill(0), total: 0 },
    ]);
  });
});
