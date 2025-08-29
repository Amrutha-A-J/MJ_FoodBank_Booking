import request from 'supertest';
import express from 'express';
import volunteerStatsRouter from '../src/routes/volunteer/volunteerStats';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-stats', volunteerStatsRouter);

describe('GET /volunteer-stats/leaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns rank and percentile', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ rank: 3, percentile: 25 }],
      rowCount: 1,
    });

    const res = await request(app).get('/volunteer-stats/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rank: 3, percentile: 25 });
  });
});

