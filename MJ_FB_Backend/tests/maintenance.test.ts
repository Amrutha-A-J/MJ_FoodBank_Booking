import request from 'supertest';
import express from 'express';
import maintenanceRouter from '../src/routes/maintenance';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    (req as any).user = { access: ['admin'] };
    next();
  },
  authorizeAccess: (...allowed: string[]) => (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const access = ((req.user as any)?.access || []) as string[];
    if (allowed.some(a => access.includes(a))) return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
}));

const app = express();
app.use(express.json());
app.use('/maintenance', maintenanceRouter);

afterEach(() => {
  jest.clearAllMocks();
});

describe('maintenance routes', () => {
  it('returns maintenance status', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/maintenance');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ maintenanceMode: false, notice: null });
  });

  it('updates maintenance mode and notice', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          { key: 'maintenance_mode', value: 'true' },
          { key: 'maintenance_notice', value: 'Down' },
        ],
      });
    const res = await request(app)
      .put('/maintenance')
      .send({ maintenanceMode: true, notice: 'Down' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ maintenanceMode: true, notice: 'Down' });
    expect((pool.query as jest.Mock).mock.calls).toHaveLength(3);
  });

  it('clears maintenance config', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({});
    const res = await request(app).delete('/maintenance');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ maintenanceMode: false, notice: null });
    expect((pool.query as jest.Mock).mock.calls[0][0]).toContain('DELETE FROM app_config');
  });
});
