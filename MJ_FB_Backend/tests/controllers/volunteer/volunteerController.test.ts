import request from 'supertest';
import express from 'express';
import type { Request, Response } from 'express';

import volunteerStatsRouter from '../../../src/routes/volunteerStats';
import volunteersRouter from '../../../src/routes/volunteer/volunteers';
import pool from '../../../src/db';
import { getVolunteerRanking } from '../../../src/controllers/volunteer/volunteerStatsController';

jest.mock('../../../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const createApp = (user?: { id: number; role?: string }) => {
  const app = express();
  app.use(express.json());
  if (user) {
    app.use((req, _res, next) => {
      (req as any).user = user;
      next();
    });
  }
  app.use('/volunteer-stats', volunteerStatsRouter);
  app.use('/volunteers', volunteersRouter);
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status || 500).json({ message: err.message });
  });
  return app;
};

const createMockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('Volunteer controller endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('volunteer ranking listing', () => {
    it('lists top volunteers filtered by role ID', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 9, name: 'Dana Volunteer', total: '7' }],
      });
      const app = createApp({ id: 1, role: 'staff' });
      const res = await request(app).get('/volunteer-stats/ranking?roleId=3');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 9, name: 'Dana Volunteer', total: 7 }]);
      const params = (pool.query as jest.Mock).mock.calls[0][1];
      expect(params).toEqual([3]);
    });

    it('passes invalid role filters to the error handler', async () => {
      const req = { query: { roleId: 'not-a-number' } } as unknown as Request;
      const res = createMockResponse();
      const next = jest.fn();
      const error = new Error('invalid input syntax for integer: "NaN"');

      (pool.query as jest.Mock).mockRejectedValueOnce(error);

      await getVolunteerRanking(req, res, next);

      expect(pool.query).toHaveBeenCalled();
      const params = (pool.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params).toHaveLength(1);
      expect(Number.isNaN(params[0] as number)).toBe(true);
      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('volunteer stats retrieval', () => {
    it('returns computed stats for the authenticated volunteer', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ badge_code: 'helper' }] })
        .mockResolvedValueOnce({ rows: [{ early: false }] })
        .mockResolvedValueOnce({
          rows: [{ lifetime_hours: '12', month_hours: '4', total_shifts: '10' }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '12' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              families_served: '6',
              pounds_handled: '300',
              month_families_served: '3',
              month_pounds_handled: '120',
            },
          ],
        });

      const app = createApp({ id: 42, role: 'volunteer' });
      const res = await request(app).get('/volunteers/me/stats');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        lifetimeHours: 12,
        monthHours: 4,
        totalShifts: 10,
        milestone: 10,
        milestoneText: 'Congratulations on completing 10 shifts!',
        familiesServed: 6,
        poundsHandled: 300,
        monthFamiliesServed: 3,
        monthPoundsHandled: 120,
      });
      expect(res.body.badges).toEqual(expect.arrayContaining(['helper', 'heavy-lifter']));
      expect(res.body.badges).toHaveLength(2);
      expect(res.body.currentStreak).toBe(0);
    });

    it('rejects stats requests without an authenticated user', async () => {
      const app = createApp();
      const res = await request(app).get('/volunteers/me/stats');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'Unauthorized' });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('badge award and removal', () => {
    it('awards a badge to the signed-in volunteer', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({});
      const app = createApp({ id: 7, role: 'volunteer' });
      const res = await request(app).post('/volunteers/me/badges').send({ badgeCode: 'kindness' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ badgeCode: 'kindness' });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO volunteer_badges'),
        [7, 'kindness'],
      );
    });

    it('removes a badge from the signed-in volunteer', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      const app = createApp({ id: 7, role: 'volunteer' });
      const res = await request(app).delete('/volunteers/me/badges/kindness');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ badgeCode: 'kindness' });
      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM volunteer_badges WHERE volunteer_id = $1 AND badge_code = $2',
        [7, 'kindness'],
      );
    });

    it('rejects badge awards without authentication', async () => {
      const app = createApp();
      const res = await request(app).post('/volunteers/me/badges').send({ badgeCode: 'kindness' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'Unauthorized' });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});

export {};
