import request from 'supertest';
import express from 'express';
import donorsRoutes from '../src/routes/donors';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const app = express();
app.use('/donors', donorsRoutes);

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

describe('GET /donors/:id/donations', () => {
  it('returns donations in reverse chronological order', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [
          { id: 2, date: '2024-03-01', weight: 30 },
          { id: 1, date: '2024-02-01', weight: 20 },
        ],
      });

    const res = await request(app)
      .get('/donors/5/donations')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
      [1],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      `SELECT n.id, n.date, n.weight
       FROM donations n
       JOIN donors d ON n.donor_id = d.id
       WHERE d.id = $1
       ORDER BY n.date DESC, n.id DESC`,
      ['5'],
    );
    expect(res.body).toEqual([
      { id: 2, date: '2024-03-01', weight: 30 },
      { id: 1, date: '2024-02-01', weight: 20 },
    ]);
  });
});

