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
app.use(express.json());
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

  it('lists available months', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          month: 4,
          orders: 0,
          adults: 0,
          children: 0,
          weight: 0,
        },
        {
          month: 5,
          orders: 1,
          adults: 0,
          children: 0,
          weight: 0,
        },
      ],
    });

    const res = await request(app).get('/pantry-aggregations/months?year=2024');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([5]);
  });

  it('lists available weeks', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          week: 1,
          orders: 0,
          adults: 0,
          children: 0,
          weight: 0,
        },
        {
          week: 2,
          orders: 1,
          adults: 0,
          children: 0,
          weight: 0,
        },
      ],
    });

    const res = await request(app).get('/pantry-aggregations/weeks?year=2024&month=5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([2]);
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
      'attachment; filename=2024_05_2024-04-29_to_2024-05-03_week_1_agggregation.xlsx',
    );
    expect(res.body).toEqual(Buffer.from('test'));
  });

  it('inserts manual aggregation', async () => {
    const body = {
      year: 2024,
      month: 5,
      orders: 1,
      adults: 2,
      children: 3,
      people: 5,
      weight: 10,
    };
    (pool.query as jest.Mock).mockResolvedValueOnce({});
    const res = await request(app).post('/pantry-aggregations/manual').send(body);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Saved' });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pantry_monthly_overall'),
      [2024, 5, 1, 2, 3, 5, 10],
    );
  });

  it('updates manual aggregation', async () => {
    const body1 = {
      year: 2024,
      month: 5,
      orders: 1,
      adults: 2,
      children: 3,
      people: 5,
      weight: 10,
    };
    (pool.query as jest.Mock).mockResolvedValueOnce({});
    await request(app).post('/pantry-aggregations/manual').send(body1);

    const body2 = {
      year: 2024,
      month: 5,
      orders: 2,
      adults: 3,
      children: 4,
      people: 7,
      weight: 20,
    };
    (pool.query as jest.Mock).mockResolvedValueOnce({});
    const res = await request(app).post('/pantry-aggregations/manual').send(body2);
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenLastCalledWith(
      expect.any(String),
      [2024, 5, 2, 3, 4, 7, 20],
    );
  });
});
