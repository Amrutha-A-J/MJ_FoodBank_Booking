import request from 'supertest';
import express from 'express';
import volunteerStatsRoutes from '../src/routes/volunteer/volunteerStats';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('../src/db');
jest.mock('jsonwebtoken');

const app = express();
app.use('/volunteer-stats', volunteerStatsRoutes);

beforeEach(() => {
  jest.clearAllMocks();
  (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff' });
});

describe('GET /volunteer-stats/group', () => {
  it('returns aggregated volunteer stats', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ hours: 10 }] })
      .mockResolvedValueOnce({ rows: [{ lbs: 250 }] });

    const res = await request(app)
      .get('/volunteer-stats/group')
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      week: { distributedLbs: 250 },
      month: { volunteerHours: 10, goalHours: expect.any(Number) },
    });
  });
});
