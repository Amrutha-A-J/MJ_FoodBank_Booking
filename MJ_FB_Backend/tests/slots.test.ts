import request from 'supertest';
import express from 'express';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    req.user = { role: 'staff' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock('../src/routes/pantry/aggregations', () => {
  const express = require('express');
  return express.Router();
});

let app: express.Express;
let setHolidaysFn: (value: Map<string, string> | null) => void;

beforeAll(async () => {
  const holidays = await import('../src/utils/holidayCache');
  setHolidaysFn = holidays.setHolidays;
  app = (await import('../src/app')).default;
});

beforeEach(() => {
  (pool.query as jest.Mock).mockReset();
  (pool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  setHolidaysFn(new Map());
});

describe('GET /api/v1/slots with invalid dates', () => {

  it('returns 400 for malformed date string', async () => {
    const res = await request(app).get('/api/v1/slots').query({ date: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid date');
  });

  it('returns 400 for invalid date format', async () => {
    const res = await request(app).get('/api/v1/slots').query({ date: '2024-02-30abc' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid date');
  });
});

describe('GET /api/v1/slots applies slot rules', () => {

  it('uses weekday rules', async () => {
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('FROM holidays')) return Promise.resolve({ rowCount: 0, rows: [] });
      if (sql.startsWith('SELECT id, start_time'))
        return Promise.resolve({
          rows: [
            { id: 1, start_time: '09:00:00', end_time: '09:30:00', max_capacity: 10 },
            { id: 2, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 10 },
            { id: 3, start_time: '12:00:00', end_time: '12:30:00', max_capacity: 10 },
            { id: 4, start_time: '12:30:00', end_time: '13:00:00', max_capacity: 10 },
            { id: 5, start_time: '14:30:00', end_time: '15:00:00', max_capacity: 10 },
          ],
        });
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).get('/api/v1/slots').query({ date: '2024-06-17' });
    expect(res.status).toBe(200);
    expect(res.body.map((s: any) => s.startTime)).toEqual([
      '09:30:00',
      '14:30:00',
    ]);
  });

  it('uses Wednesday rules', async () => {
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('FROM holidays')) return Promise.resolve({ rowCount: 0, rows: [] });
      if (sql.startsWith('SELECT id, start_time'))
        return Promise.resolve({
          rows: [
            { id: 1, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 10 },
            { id: 2, start_time: '15:30:00', end_time: '16:00:00', max_capacity: 10 },
            { id: 3, start_time: '18:30:00', end_time: '19:00:00', max_capacity: 10 },
          ],
        });
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).get('/api/v1/slots').query({ date: '2024-06-19' });
    expect(res.status).toBe(200);
    expect(res.body.map((s: any) => s.startTime)).toEqual([
      '09:30:00',
      '18:30:00',
    ]);
  });

  it('lists Wednesday evening slot in range', async () => {
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.startsWith('SELECT date, slot_id, reason FROM blocked_slots')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT day_of_week, week_of_month')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT day_of_week, slot_id, reason FROM breaks')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT date, slot_id, COUNT(*)')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT id, start_time'))
        return Promise.resolve({
          rows: [
            { id: 1, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 10 },
            { id: 2, start_time: '18:30:00', end_time: '19:00:00', max_capacity: 10 },
          ],
        });
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .get('/api/v1/slots/range')
      .query({ start: '2024-06-19', days: 1, includePast: 'true' });
    expect(res.status).toBe(200);
    expect(res.body[0].date).toBe('2024-06-19');
    expect(res.body[0].slots.map((s: any) => s.startTime)).toEqual([
      '09:30:00',
      '18:30:00',
    ]);
  });

  it('marks slots blocked from recurring entries', async () => {
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('FROM holidays')) return Promise.resolve({ rowCount: 0, rows: [] });
      if (sql.startsWith('SELECT id, start_time'))
        return Promise.resolve({
          rows: [
            { id: 1, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 5 },
          ],
        });
      if (sql.startsWith('SELECT date, slot_id, reason FROM blocked_slots')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT day_of_week, week_of_month'))
        return Promise.resolve({ rows: [{ slot_id: 1, reason: 'maintenance', day_of_week: 2, week_of_month: 3 }] });
      if (sql.startsWith('SELECT day_of_week, slot_id, reason FROM breaks')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT date, slot_id, COUNT(*)')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).get('/api/v1/slots').query({ date: '2024-06-18' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: '1',
        startTime: '09:30:00',
        endTime: '10:00:00',
        maxCapacity: 5,
        available: 0,
        overbooked: false,
        reason: 'maintenance',
        status: 'blocked',
      },
    ]);
  });

  it('omits blocked slot reason for non-staff users', async () => {
    jest.resetModules();
    jest.doMock('../src/middleware/authMiddleware', () => ({
      authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
        req.user = { role: 'shopper' };
        next();
      },
      authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
      authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
      optionalAuthMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
    }));
    await jest.isolateModulesAsync(async () => {
      app = (await import('../src/app')).default;
    });
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('FROM holidays')) return Promise.resolve({ rowCount: 0, rows: [] });
      if (sql.startsWith('SELECT id, start_time'))
        return Promise.resolve({
          rows: [{ id: 1, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 5 }],
        });
      if (sql.startsWith('SELECT date, slot_id, reason FROM blocked_slots'))
        return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT day_of_week, week_of_month'))
        return Promise.resolve({
          rows: [{ slot_id: 1, reason: 'maintenance', day_of_week: 2, week_of_month: 3 }],
        });
      if (sql.startsWith('SELECT day_of_week, slot_id, reason FROM breaks'))
        return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT date, slot_id, COUNT(*)'))
        return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).get('/api/v1/slots').query({ date: '2024-06-18' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: '1',
        startTime: '09:30:00',
        endTime: '10:00:00',
        maxCapacity: 5,
        available: 0,
        overbooked: false,
      },
    ]);
  });

  it('marks slot as overbooked when approved bookings exceed capacity', async () => {
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('FROM holidays')) return Promise.resolve({ rowCount: 0, rows: [] });
      if (sql.startsWith('SELECT id, start_time'))
        return Promise.resolve({
          rows: [
            { id: 1, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 5 },
          ],
        });
      if (sql.startsWith('SELECT date, slot_id, reason FROM blocked_slots')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT day_of_week, week_of_month')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT day_of_week, slot_id, reason FROM breaks')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT date, slot_id, COUNT(*)'))
        return Promise.resolve({ rows: [{ date: '2024-06-18', slot_id: 1, approved_count: '7' }] });
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).get('/api/v1/slots').query({ date: '2024-06-18' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: '1',
        startTime: '09:30:00',
        endTime: '10:00:00',
        maxCapacity: 5,
        available: 0,
        overbooked: true,
      },
    ]);
  });
});

describe('GET /api/v1/slots closed days', () => {

  it('returns empty array on weekends', async () => {
    const res = await request(app)
      .get('/api/v1/slots')
      .query({ date: '2024-06-16' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns empty array on holidays', async () => {
    setHolidaysFn(new Map([['2024-06-18', 'Holiday']]));
    const res = await request(app)
      .get('/api/v1/slots')
      .query({ date: '2024-06-18' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/v1/slots/range start date validation', () => {
  it('returns 400 for invalid start date', async () => {
    const res = await request(app)
      .get('/api/v1/slots/range')
      .query({ start: 'not-a-date', days: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid date');
  });
});

describe('GET /api/v1/slots/range default length', () => {
  beforeEach(() => {
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] });
  });

  it('returns 90 days when days param omitted', async () => {
    const res = await request(app).get('/api/v1/slots/range');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(90);
  });
});

describe('GET /api/v1/slots/range days param validation', () => {
  beforeEach(() => {
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] });
  });

  it('accepts days=1', async () => {
    const res = await request(app)
      .get('/api/v1/slots/range')
      .query({ start: '2099-01-01', days: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('accepts days=120', async () => {
    const res = await request(app)
      .get('/api/v1/slots/range')
      .query({ start: '2099-01-01', days: 120 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(120);
  });

  it.each(['0', '-1', '121', '1.5', 'abc'])(
    'returns 400 for invalid days=%p',
    async invalid => {
      const res = await request(app)
        .get('/api/v1/slots/range')
        .query({ start: '2099-01-01', days: invalid });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        'message',
        'days must be an integer between 1 and 120',
      );
    },
  );
});

describe('GET /api/v1/slots/range bulk queries', () => {

  it('fetches metadata once for entire range', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rows: [] });

    await request(app)
      .get('/api/v1/slots/range')
      .query({ start: '2024-06-17', days: 2, includePast: 'true' });

    expect((pool.query as jest.Mock)).toHaveBeenCalledTimes(5);
    const blockedCall = (pool.query as jest.Mock).mock.calls.find((c: any[]) =>
      c[0].includes('FROM blocked_slots WHERE date = ANY($1)'),
    );
    expect(blockedCall).toBeDefined();
    expect(blockedCall![1][0]).toEqual(['2024-06-17', '2024-06-18']);
  });
});
