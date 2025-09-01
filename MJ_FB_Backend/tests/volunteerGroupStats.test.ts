import '../tests/utils/mockDb';
import request from 'supertest';
import express from 'express';
import volunteerStatsRouter from '../src/routes/volunteerStats';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).user = { id: 1, role: 'volunteer' };
  next();
});
app.use('/volunteer-stats', volunteerStatsRouter);

describe('Volunteer group stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns aggregated hours and weight', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          total_hours: '100',
          month_hours: '40',
          month_goal: '80',
          total_lbs: '2000',
          week_lbs: '500',
          month_lbs: '1500',
          month_families: '75',
        },
      ],
    });
    const res = await request(app).get('/volunteer-stats/group');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalHours: 100,
      monthHours: 40,
      monthHoursGoal: 80,
      totalLbs: 2000,
      weekLbs: 500,
      monthLbs: 1500,
      monthFamilies: 75,
    });
    const query = (pool.query as jest.Mock).mock.calls[0][0];
    expect(query).toContain('volunteer_bookings');
    expect(query).toContain('client_visits');
    expect(query).toContain('app_config');
    expect(query).toContain("vb.status = 'completed'");
  });
});
