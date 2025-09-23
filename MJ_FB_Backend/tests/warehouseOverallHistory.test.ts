import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const app = express();
app.use('/warehouse-overall', warehouseOverallRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /warehouse-overall/history', () => {
  it('returns historical donation aggregates', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 't@example.com', role: 'staff' }],
      })
      .mockResolvedValueOnce({
        rows: [
          { year: 2024, donations: 100, petFood: 25 },
          { year: 2023, donations: 80, petFood: 10 },
        ],
      });

    const res = await request(app)
      .get('/warehouse-overall/history')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { year: 2024, donations: 100, petFood: 25, total: 125 },
      { year: 2023, donations: 80, petFood: 10, total: 90 },
    ]);
  });
});
