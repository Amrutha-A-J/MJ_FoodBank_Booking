import request from 'supertest';
import express from 'express';
import maintenanceRouter from '../src/routes/maintenance';
import pool from '../src/db';
import {
  setMaintenanceMode,
  setMaintenanceNotice,
  setMaintenanceUpcomingNotice,
} from '../src/controllers/maintenanceController';
import {
  refreshPantryMonthly,
  refreshPantryYearly,
} from '../src/controllers/pantry/pantryAggregationController';
import { refreshWarehouseOverall } from '../src/controllers/warehouse/warehouseOverallController';
import { refreshSunshineBagOverall } from '../src/controllers/sunshineBagController';
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

jest.mock('../src/controllers/pantry/pantryAggregationController', () => ({
  __esModule: true,
  refreshPantryMonthly: jest.fn().mockResolvedValue(undefined),
  refreshPantryYearly: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/controllers/warehouse/warehouseOverallController', () => ({
  __esModule: true,
  refreshWarehouseOverall: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/controllers/sunshineBagController', () => ({
  __esModule: true,
  refreshSunshineBagOverall: jest.fn().mockResolvedValue(undefined),
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
  (pool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  (pool.connect as jest.Mock).mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  });
  (refreshPantryMonthly as jest.Mock).mockResolvedValue(undefined);
  (refreshPantryYearly as jest.Mock).mockResolvedValue(undefined);
  (refreshWarehouseOverall as jest.Mock).mockResolvedValue(undefined);
  (refreshSunshineBagOverall as jest.Mock).mockResolvedValue(undefined);
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

  it('returns maintenance settings with upcoming notice', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { key: 'maintenance_mode', value: 'true' },
        { key: 'maintenance_upcoming_notice', value: 'Scheduled downtime' },
      ],
    });

    const res = await request(app).get('/maintenance/settings');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      "SELECT key, value FROM app_config WHERE key IN ('maintenance_mode','maintenance_upcoming_notice')",
    );
    expect(res.body).toEqual({
      maintenanceMode: true,
      upcomingNotice: 'Scheduled downtime',
    });
  });

  it('updates maintenance settings including upcoming notice', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          { key: 'maintenance_mode', value: 'true' },
          { key: 'maintenance_upcoming_notice', value: 'Heads up' },
        ],
      });

    const res = await request(app)
      .put('/maintenance/settings')
      .send({ maintenanceMode: true, upcomingNotice: 'Heads up' });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      "INSERT INTO app_config (key, value) VALUES ('maintenance_mode', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      ['true'],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      "INSERT INTO app_config (key, value) VALUES ('maintenance_upcoming_notice', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      ['Heads up'],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      "SELECT key, value FROM app_config WHERE key IN ('maintenance_mode','maintenance_upcoming_notice')",
    );
    expect(res.body).toEqual({ maintenanceMode: true, upcomingNotice: 'Heads up' });
  });

  it('clears upcoming maintenance notice when empty string provided', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ key: 'maintenance_mode', value: 'false' }],
      });

    const res = await request(app)
      .put('/maintenance/settings')
      .send({ maintenanceMode: false, upcomingNotice: '' });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM app_config WHERE key = 'maintenance_upcoming_notice'",
    );
    expect(res.body).toEqual({ maintenanceMode: false, upcomingNotice: null });
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
        [],
      );
      expect(res.body).toEqual({
        deadRows: [
          { schema: 'public', table: 'bookings', deadRows: 5 },
          { schema: 'public', table: 'volunteer_bookings', deadRows: 2 },
        ],
      });
    });

    it('filters dead row counts when table query parameter is provided', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ schemaname: 'public', relname: 'bookings', n_dead_tup: 3 }],
      });

      const res = await request(app).get('/maintenance/vacuum/dead-rows?table=bookings');

      expect(res.status).toBe(200);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT schemaname, relname, n_dead_tup FROM pg_stat_user_tables WHERE relname = $1 ORDER BY n_dead_tup DESC',
        ['bookings'],
      );
      expect(res.body).toEqual({
        deadRows: [{ schema: 'public', table: 'bookings', deadRows: 3 }],
      });
    });

    it('returns 400 when table query parameter is invalid', async () => {
      const res = await request(app).get('/maintenance/vacuum/dead-rows?table=bad-table!');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Invalid table name: bad-table!' });
      expect(pool.query).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch dead row statistics',
        expect.any(Error),
      );
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

  describe('purge endpoint', () => {
    it('purges allowed tables and triggers aggregations', async () => {
      const currentYear = new Date().getUTCFullYear();
      const cutoff = `${currentYear - 1}-12-31`;

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ month_start: '2022-05-01' }] })
        .mockResolvedValueOnce({ rows: [{ month_start: '2022-05-01' }] })
        .mockResolvedValueOnce({ rows: [{ month_start: '2022-05-01' }] })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const clientQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      const release = jest.fn();
      (pool.connect as jest.Mock).mockResolvedValueOnce({ query: clientQuery, release });

      const res = await request(app)
        .post('/maintenance/purge')
        .send({
          tables: ['client_visits', 'volunteer_bookings', 'pig_pound_log'],
          before: cutoff,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        cutoff,
        purged: [
          { table: 'client_visits', months: ['2022-05'] },
          { table: 'volunteer_bookings', months: ['2022-05'] },
          { table: 'pig_pound_log', months: ['2022-05'] },
        ],
      });

      expect(refreshPantryMonthly).toHaveBeenCalledWith(2022, 5);
      expect(refreshPantryYearly).toHaveBeenCalledWith(2022);
      expect(refreshWarehouseOverall).toHaveBeenCalledWith(2022, 5);
      expect(refreshSunshineBagOverall).not.toHaveBeenCalled();

      expect(clientQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(clientQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE volunteers v'),
        [cutoff],
      );
      expect(clientQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM client_visits'),
        [cutoff],
      );
      expect(clientQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM volunteer_bookings'),
        [cutoff],
      );
      expect(clientQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM pig_pound_log'),
        [cutoff],
      );
      expect(clientQuery).toHaveBeenCalledWith('COMMIT');

      expect(pool.query).toHaveBeenCalledWith('VACUUM (ANALYZE) client_visits');
      expect(pool.query).toHaveBeenCalledWith('VACUUM (ANALYZE) volunteer_bookings');
      expect(pool.query).toHaveBeenCalledWith('VACUUM (ANALYZE) pig_pound_log');
    });

    it('rejects unsupported tables', async () => {
      const currentYear = new Date().getUTCFullYear();
      const cutoff = `${currentYear - 1}-12-31`;

      const res = await request(app)
        .post('/maintenance/purge')
        .send({ tables: ['bad_table'], before: cutoff });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Unsupported table: bad_table' });
      expect(pool.query).not.toHaveBeenCalled();
      expect(pool.connect).not.toHaveBeenCalled();
    });

    it('rejects cutoff dates in the current year', async () => {
      const currentYear = new Date().getUTCFullYear();
      const cutoff = `${currentYear}-01-01`;

      const res = await request(app)
        .post('/maintenance/purge')
        .send({ tables: ['bookings'], before: cutoff });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: 'Cutoff date must be before January 1 of the current year',
      });
      expect(pool.query).not.toHaveBeenCalled();
      expect(pool.connect).not.toHaveBeenCalled();
    });

    it('forwards errors from aggregation helpers', async () => {
      const currentYear = new Date().getUTCFullYear();
      const cutoff = `${currentYear - 1}-12-31`;
      const aggregationError = new Error('aggregation failed');

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ month_start: '2022-05-01' }] })
        .mockResolvedValue({ rows: [], rowCount: 0 });
      (refreshPantryMonthly as jest.Mock).mockRejectedValueOnce(aggregationError);

      const res = await request(app)
        .post('/maintenance/purge')
        .send({ tables: ['client_visits'], before: cutoff });

      expect(res.status).toBe(500);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to purge maintenance data',
        aggregationError,
      );
      expect(pool.connect).not.toHaveBeenCalled();
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

  describe('setMaintenanceUpcomingNotice', () => {
    it('skips database update when upcoming notice is missing', async () => {
      const req = { body: {} } as express.Request;
      const res = {} as express.Response;
      const next = jest.fn();

      await setMaintenanceUpcomingNotice(req, res, next);

      expect(pool.query as jest.Mock).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('logs and forwards errors when updating upcoming notice fails', async () => {
      const error = new Error('Database failure');
      (pool.query as jest.Mock).mockRejectedValueOnce(error);

      const req = {
        body: { upcomingNotice: 'Heads up' },
      } as express.Request;
      const res = {} as express.Response;
      const next = jest.fn();

      await setMaintenanceUpcomingNotice(req, res, next);

      expect(pool.query as jest.Mock).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Error setting maintenance upcoming notice:',
        error,
      );
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
