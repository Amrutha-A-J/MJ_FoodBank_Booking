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

describe('Volunteer ranking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns top volunteers overall', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Alice', total: 5 }],
    });
    const res = await request(app).get('/volunteer-stats/ranking');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: 'Alice', total: 5 }]);
    const query = (pool.query as jest.Mock).mock.calls[0][0];
    expect(query).toContain("vb.status = 'completed'");
  });

  it('filters by role', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    await request(app).get('/volunteer-stats/ranking?roleId=2');
    const params = (pool.query as jest.Mock).mock.calls[0][1];
    expect(params).toEqual([2]);
  });
});
