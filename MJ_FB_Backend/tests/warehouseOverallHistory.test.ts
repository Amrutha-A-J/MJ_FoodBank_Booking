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

describe('GET /warehouse-overall/monthly-history', () => {
  it('returns monthly incoming totals grouped by year', async () => {
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
          { year: 2024, month: 1, donations: 50, petFood: 10 },
          { year: 2024, month: 2, donations: 5, petFood: 0 },
          { year: 2023, month: 12, donations: 20, petFood: 5 },
        ],
      });

    const res = await request(app)
      .get('/warehouse-overall/monthly-history')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      years: [2024, 2023],
      entries: [
        { year: 2024, month: 1, donations: 50, petFood: 10, total: 60 },
        { year: 2024, month: 2, donations: 5, petFood: 0, total: 5 },
        { year: 2023, month: 12, donations: 20, petFood: 5, total: 25 },
      ],
    });
  });
});
