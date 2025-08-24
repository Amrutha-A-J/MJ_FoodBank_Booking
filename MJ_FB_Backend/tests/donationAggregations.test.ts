import request from 'supertest';
import express from 'express';
import donationsRoutes from '../src/routes/donations';
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
  it('returns donor aggregations for the year', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff' });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 't@example.com', role: 'staff' }],
      })
      .mockResolvedValueOnce({
        rows: [
          { donor: 'Alice', month: 1, total: 100 },
          { donor: 'Alice', month: 2, total: 50 },
          { donor: 'Bob', month: 1, total: 25 },
        ],
      });

    const res = await request(app)
      .get('/donations/aggregations?year=2024')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { donor: 'Alice', monthlyTotals: [100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 150 },
      { donor: 'Bob', monthlyTotals: [25, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 25 },
    ]);
  });
});
