import request from 'supertest';
import express from 'express';
import volunteersRouter from '../src/routes/volunteer/volunteers';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 1, role: 'volunteer' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteers', volunteersRouter);

describe('GET /volunteers/me/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns volunteer stats with milestone', async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const day = today.getUTCDay();
    const diff = (day + 6) % 7;
    const thisMonday = new Date(today);
    thisMonday.setUTCDate(thisMonday.getUTCDate() - diff);
    const lastMonday = new Date(thisMonday);
    lastMonday.setUTCDate(lastMonday.getUTCDate() - 7);

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ hours: 10, month_hours: 4, shifts: 5 }] })
      .mockResolvedValueOnce({
        rows: [
          { week_start: thisMonday.toISOString().slice(0, 10) },
          { week_start: lastMonday.toISOString().slice(0, 10) },
        ],
      });

    const res = await request(app).get('/volunteers/me/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      lifetimeHours: 10,
      monthHours: 4,
      totalShifts: 5,
      currentStreak: 2,
      milestone: 5,
    });
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/FROM volunteer_bookings vb\s+JOIN volunteer_slots vs/);
  });
});
