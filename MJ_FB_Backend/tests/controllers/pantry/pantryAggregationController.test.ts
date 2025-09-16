jest.mock('../../../src/controllers/pantry/pantryAggregationController', () => ({
  listPantryWeekly: jest.fn(),
  listPantryMonthly: jest.fn(),
  listPantryYearly: jest.fn(),
  exportPantryWeekly: jest.fn(),
  exportPantryMonthly: jest.fn(),
  exportPantryYearly: jest.fn(),
  manualPantryAggregate: jest.fn(),
  refreshPantryWeekly: jest.fn(),
  refreshPantryMonthly: jest.fn(),
  refreshPantryYearly: jest.fn(),
  firstMondayOfMonth: jest.fn((year: number, month: number) => new Date(Date.UTC(year, month - 1, 1))),
  listAvailableYears: jest.fn(),
  listAvailableMonths: jest.fn(),
  listAvailableWeeks: jest.fn(),
}));

import mockPool from '../../utils/mockDb';
import {
  manualWeeklyPantryAggregate,
  listWeeklyAggregations,
  listMonthlyAggregations,
  listYearlyAggregations,
  exportAggregations,
  rebuildAggregations,
} from '../../../src/controllers/pantryAggregationController';
import {
  listPantryWeekly,
  listPantryMonthly,
  listPantryYearly,
  exportPantryWeekly,
  manualPantryAggregate,
} from '../../../src/controllers/pantry/pantryAggregationController';

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  setHeader: jest.fn().mockReturnThis(),
  send: jest.fn(),
});

describe('pantryAggregationController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPool.query as jest.Mock).mockReset();
  });

  it('forwards weekly filters including date range and item types', async () => {
    const req = {
      query: {
        year: '2024',
        month: '5',
        startDate: '2024-05-01',
        endDate: '2024-05-31',
        itemTypes: 'produce,dairy',
      },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    (listPantryWeekly as jest.Mock).mockImplementation(async (incomingReq, incomingRes) => {
      expect(incomingReq).toBe(req);
      expect(incomingReq.query).toMatchObject({
        startDate: '2024-05-01',
        endDate: '2024-05-31',
        itemTypes: 'produce,dairy',
      });
      incomingRes.json([{ week: 1, orders: 10 }]);
    });

    await listWeeklyAggregations(req, res, next);

    expect(listPantryWeekly).toHaveBeenCalledWith(req, res, next);
    expect(res.json).toHaveBeenCalledWith([{ week: 1, orders: 10 }]);
  });

  it('passes date filters to monthly aggregations', async () => {
    const req = {
      query: {
        year: '2024',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    (listPantryMonthly as jest.Mock).mockImplementation(async (incomingReq, incomingRes) => {
      expect(incomingReq.query).toMatchObject({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      incomingRes.json([{ month: 5, orders: 25 }]);
    });

    await listMonthlyAggregations(req, res, next);

    expect(listPantryMonthly).toHaveBeenCalledWith(req, res, next);
    expect(res.json).toHaveBeenCalledWith([{ month: 5, orders: 25 }]);
  });

  it('passes item type filters to yearly aggregations', async () => {
    const req = {
      query: {
        year: '2024',
        itemTypes: 'meat,produce',
      },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    (listPantryYearly as jest.Mock).mockImplementation(async (incomingReq, incomingRes) => {
      expect(incomingReq.query).toMatchObject({
        itemTypes: 'meat,produce',
      });
      incomingRes.json([{ year: 2024, orders: 120 }]);
    });

    await listYearlyAggregations(req, res, next);

    expect(listPantryYearly).toHaveBeenCalledWith(req, res, next);
    expect(res.json).toHaveBeenCalledWith([{ year: 2024, orders: 120 }]);
  });

  it('routes weekly export requests with all filters applied', async () => {
    const req = {
      query: {
        period: 'weekly',
        year: '2024',
        month: '6',
        week: '2',
        startDate: '2024-06-03',
        endDate: '2024-06-07',
        itemTypes: 'dairy',
      },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    (exportPantryWeekly as jest.Mock).mockImplementation(async (incomingReq, incomingRes) => {
      expect(incomingReq.query).toMatchObject({
        period: 'weekly',
        year: '2024',
        month: '6',
        week: '2',
        startDate: '2024-06-03',
        endDate: '2024-06-07',
        itemTypes: 'dairy',
      });
      incomingRes.setHeader('Content-Type', 'application/octet-stream').send(Buffer.from('data'));
    });

    await exportAggregations(req, res as any, next);

    expect(exportPantryWeekly).toHaveBeenCalledWith(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(res.send).toHaveBeenCalledWith(Buffer.from('data'));
  });

  it('returns 400 for export requests without a valid period', async () => {
    const req = { query: {} } as any;
    const res = createResponse();

    await exportAggregations(req, res as any, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid period' });
  });

  it('requires week when posting weekly aggregates', async () => {
    const req = { body: { year: 2024, month: 6 } } as any;
    const res = createResponse();

    await manualWeeklyPantryAggregate(req, res as any, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Week required' });
  });

  it('delegates weekly aggregates to the shared manual handler', async () => {
    const req = { body: { year: 2024, month: 6, week: 2 } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    (manualPantryAggregate as jest.Mock).mockImplementation(async (_req, incomingRes) => {
      incomingRes.json({ message: 'Saved' });
    });

    await manualWeeklyPantryAggregate(req, res, next);

    expect(manualPantryAggregate).toHaveBeenCalledWith(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ message: 'Saved' });
  });

  it('handles database failures when rebuilding aggregations', async () => {
    const error = new Error('db failed');
    (mockPool.query as jest.Mock).mockRejectedValueOnce(error);
    const req = {} as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await rebuildAggregations(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
