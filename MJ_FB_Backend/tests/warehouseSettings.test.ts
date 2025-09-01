import request from 'supertest';
import express from 'express';
import warehouseSettingsRouter from '../src/routes/admin/warehouseSettings';
import pool from '../src/db';
import {
  getWarehouseSettings,
  updateWarehouseSettings,
  clearWarehouseSettingsCache,
} from '../src/utils/warehouseSettings';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/warehouse-settings', warehouseSettingsRouter);

afterEach(() => {
  jest.clearAllMocks();
  clearWarehouseSettingsCache();
});

describe('warehouse settings routes', () => {
  it('gets settings', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { key: 'bread_weight_multiplier', value: '11' },
        { key: 'cans_weight_multiplier', value: '22' },
      ],
    });
    const res = await request(app).get('/warehouse-settings');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ breadWeightMultiplier: 11, cansWeightMultiplier: 22 });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('updates settings', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({});
    const res = await request(app)
      .put('/warehouse-settings')
      .send({ breadWeightMultiplier: 12, cansWeightMultiplier: 23 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ breadWeightMultiplier: 12, cansWeightMultiplier: 23 });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO app_config'),
      [
        'bread_weight_multiplier',
        '12',
        'cans_weight_multiplier',
        '23',
      ],
    );
  });
});

describe('warehouse settings cache', () => {
  it('caches values until updated', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { key: 'bread_weight_multiplier', value: '10' },
        { key: 'cans_weight_multiplier', value: '20' },
      ],
    });
    const first = await getWarehouseSettings();
    expect(first).toEqual({ breadWeightMultiplier: 10, cansWeightMultiplier: 20 });
    const second = await getWarehouseSettings();
    expect(second).toEqual(first);
    expect(pool.query).toHaveBeenCalledTimes(1);

    (pool.query as jest.Mock).mockResolvedValueOnce({});
    await updateWarehouseSettings({ breadWeightMultiplier: 15, cansWeightMultiplier: 25 });
    const third = await getWarehouseSettings();
    expect(third).toEqual({ breadWeightMultiplier: 15, cansWeightMultiplier: 25 });
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});
