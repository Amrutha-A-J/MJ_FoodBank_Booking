import request from 'supertest';
import express from 'express';
import volunteerStatsRouter from '../src/routes/volunteerStats';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const createApp = (user?: { id: number; role: string }) => {
  const app = express();
  app.use(express.json());
  if (user) {
    app.use((req, _res, next) => {
      (req as any).user = user;
      next();
    });
  }
  app.use('/volunteer-stats', volunteerStatsRouter);
  return app;
};

describe('Volunteer leaderboard', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp({ id: 1, role: 'volunteer' });
  });

  it('returns rank and percentile', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ rank: 5, percentile: 80 }] });
    const res = await request(app).get('/volunteer-stats/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rank: 5, percentile: 80 });
    const query = (pool.query as jest.Mock).mock.calls[0][0];
    expect(query).toContain('volunteer_counts');
    expect(query).toContain('::numeric');
    expect(query).toContain("vb.status = 'completed'");
  });

  it('returns 401 when user context is missing', async () => {
    const res = await request(createApp()).get('/volunteer-stats/leaderboard');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Unauthorized' });
    expect(pool.query as jest.Mock).not.toHaveBeenCalled();
  });

  it('returns null values when the leaderboard query has no rows', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/volunteer-stats/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rank: null, percentile: null });
  });
});
