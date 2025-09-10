import request from 'supertest';
import express from 'express';
import pool from '../src/db';
import './utils/mockDb';
import 'write-excel-file/node';

jest.mock('write-excel-file/node', () => jest.fn().mockResolvedValue(Buffer.from('test')));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => next(),
  authorizeAccess: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../src/controllers/pantry/pantryAggregationController', () => {
  const actual = jest.requireActual('../src/controllers/pantry/pantryAggregationController');
  return {
    ...actual,
    refreshPantryWeekly: jest.fn(),
    refreshPantryMonthly: jest.fn(),
    refreshPantryYearly: jest.fn(),
  };
});

const pantryAggregationsRoutes = require('../src/routes/pantry/aggregations').default;
const {
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} = require('../src/controllers/pantry/pantryAggregationController');

const app = express();
app.use('/pantry-aggregations', pantryAggregationsRoutes);

describe('pantry aggregation routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists weekly aggregations', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ week: 1 }] });

    const res = await request(app).get('/pantry-aggregations/weekly?year=2024&month=5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ week: 1 }]);
  });

  it('rebuilds aggregations', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ min_year: 2024, max_year: 2024 }] });

    const res = await request(app).post('/pantry-aggregations/rebuild');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Rebuilt' });
    expect(refreshPantryMonthly).toHaveBeenCalledTimes(12);
    expect(refreshPantryWeekly).toHaveBeenCalledTimes(72);
    expect(refreshPantryYearly).toHaveBeenCalledWith(2024);
  });

  it('exports aggregations', async () => {
    const res = await request(app)
      .get('/pantry-aggregations/export?period=weekly&year=2024&month=5&week=1')
      .buffer()
      .parse((res, cb) => {
        const data: Buffer[] = [];
        res.on('data', chunk => data.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename=2024_May_week1_pantry_stats.xlsx',
    );
    expect(res.body).toEqual(Buffer.from('test'));
  });
});
