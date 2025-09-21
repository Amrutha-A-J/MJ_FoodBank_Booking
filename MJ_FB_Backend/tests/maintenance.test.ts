import request from 'supertest';
import express from 'express';
import maintenanceRouter from '../src/routes/maintenance';
import pool from '../src/db';
import {
  setMaintenanceMode,
  setMaintenanceNotice,
} from '../src/controllers/maintenanceController';
import logger from '../src/utils/logger';

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
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const status = err?.status ?? 500;
    res.status(status).json({ message: err?.message ?? 'Internal Server Error' });
  },
);

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

  it('clears maintenance stats', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({});
    const res = await request(app).delete('/maintenance/stats');
    expect(res.status).toBe(204);
    expect((pool.query as jest.Mock).mock.calls[0][0]).toContain('DELETE FROM stats');
  });

  describe('vacuum endpoints', () => {
    it('runs VACUUM ANALYZE for specific tables', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const res = await request(app)
        .post('/maintenance/vacuum')
        .send({ tables: ['bookings', 'volunteer_bookings'] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        scope: 'tables',
        tables: ['bookings', 'volunteer_bookings'],
      });
      expect(pool.query).toHaveBeenNthCalledWith(1, 'VACUUM (ANALYZE) bookings');
      expect(pool.query).toHaveBeenNthCalledWith(
        2,
        'VACUUM (ANALYZE) volunteer_bookings',
      );
    });

    it('runs VACUUM ANALYZE for the entire database when no tables are provided', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({});

      const res = await request(app).post('/maintenance/vacuum').send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, scope: 'database', tables: [] });
      expect(pool.query).toHaveBeenCalledWith('VACUUM (ANALYZE)');
    });

    it('rejects invalid table names', async () => {
      const res = await request(app)
        .post('/maintenance/vacuum')
        .send({ tables: ['bad-table!'] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Invalid table names: bad-table!' });
      expect(pool.query).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to run VACUUM ANALYZE',
        expect.any(Error),
      );
    });

    it('runs VACUUM ANALYZE for a specific table via route param', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({});

      const res = await request(app).post('/maintenance/vacuum/bookings');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        scope: 'tables',
        tables: ['bookings'],
      });
      expect(pool.query).toHaveBeenCalledWith('VACUUM (ANALYZE) bookings');
    });

    it('logs and forwards errors when VACUUM ANALYZE fails', async () => {
      const error = new Error('vacuum failed');
      (pool.query as jest.Mock).mockRejectedValueOnce(error);

      const res = await request(app).post('/maintenance/vacuum/bookings');

      expect(res.status).toBe(500);
      expect(pool.query).toHaveBeenCalledWith('VACUUM (ANALYZE) bookings');
      expect(logger.error).toHaveBeenCalledWith('Failed to run VACUUM ANALYZE', error);
    });

    it('returns dead row counts', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { schemaname: 'public', relname: 'bookings', n_dead_tup: 5 },
          { schemaname: 'public', relname: 'volunteer_bookings', n_dead_tup: 2 },
        ],
      });

      const res = await request(app).get('/maintenance/vacuum/dead-rows');

      expect(res.status).toBe(200);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT schemaname, relname, n_dead_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC',
      );
      expect(res.body).toEqual({
        deadRows: [
          { schema: 'public', table: 'bookings', deadRows: 5 },
          { schema: 'public', table: 'volunteer_bookings', deadRows: 2 },
        ],
      });
    });

    it('logs and forwards errors when fetching dead row counts fails', async () => {
      const error = new Error('stats failed');
      (pool.query as jest.Mock).mockRejectedValueOnce(error);

      const res = await request(app).get('/maintenance/vacuum/dead-rows');

      expect(res.status).toBe(500);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch dead row statistics',
        error,
      );
    });
  });
});

describe('maintenance controllers', () => {
  describe('setMaintenanceMode', () => {
    it('skips database update when maintenanceMode is missing', async () => {
      const req = { body: {} } as express.Request;
      const res = {} as express.Response;
      const next = jest.fn();

      await setMaintenanceMode(req, res, next);

      expect(pool.query as jest.Mock).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('logs and forwards errors when updating maintenance mode fails', async () => {
      const error = new Error('Database failure');
      (pool.query as jest.Mock).mockRejectedValueOnce(error);

      const req = { body: { maintenanceMode: true } } as express.Request;
      const res = {} as express.Response;
      const next = jest.fn();

      await setMaintenanceMode(req, res, next);

      expect(pool.query as jest.Mock).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Error setting maintenance mode:',
        error,
      );
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('setMaintenanceNotice', () => {
    it('skips database update when notice is missing', async () => {
      const req = { body: {} } as express.Request;
      const res = {} as express.Response;
      const next = jest.fn();

      await setMaintenanceNotice(req, res, next);

      expect(pool.query as jest.Mock).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('logs and forwards errors when updating maintenance notice fails', async () => {
      const error = new Error('Database failure');
      (pool.query as jest.Mock).mockRejectedValueOnce(error);

      const req = { body: { notice: 'Scheduled maintenance' } } as express.Request;
      const res = {} as express.Response;
      const next = jest.fn();

      await setMaintenanceNotice(req, res, next);

      expect(pool.query as jest.Mock).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Error setting maintenance notice:',
        error,
      );
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
