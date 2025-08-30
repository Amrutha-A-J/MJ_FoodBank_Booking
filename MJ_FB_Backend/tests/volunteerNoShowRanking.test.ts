import request from 'supertest';
import express from 'express';
import volunteerStatsRouter from '../src/routes/volunteerStats';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).user = { id: 1, role: 'staff' };
  next();
});
app.use('/volunteer-stats', volunteerStatsRouter);

describe('Volunteer no-show ranking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ranking list', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Alice', total_bookings: 10, no_shows: 4, no_show_rate: 0.4 },
      ],
    });
    const res = await request(app).get('/volunteer-stats/no-show-ranking');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, name: 'Alice', totalBookings: 10, noShows: 4, noShowRate: 0.4 },
    ]);
    const query = (pool.query as jest.Mock).mock.calls[0][0];
    expect(query).toContain('no_show');
    expect(query).toContain('ORDER BY');
  });
});
