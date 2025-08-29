import request from 'supertest';
import express from 'express';
import statsRouter from '../src/routes/volunteer/volunteerStats';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use('/volunteer-stats', statsRouter);

describe('GET /volunteer-stats/group', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns aggregated volunteer stats', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            total_hours: 10,
            total_lbs: 50,
            month_hours: 3,
            month_lbs: 20,
            week_lbs: 5,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ goal: 100 }] });

    const res = await request(app).get('/volunteer-stats/group');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalHours: 10,
      totalLbs: 50,
      currentMonth: { hours: 3, lbs: 20, goalHours: 100 },
      currentWeekLbs: 5,
    });
  });
});
