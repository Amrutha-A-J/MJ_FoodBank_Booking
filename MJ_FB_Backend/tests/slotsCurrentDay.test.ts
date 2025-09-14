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
let setHolidays: (value: Map<string, string> | null) => void;

beforeAll(async () => {
  const holidays = await import('../src/utils/holidayCache');
  setHolidays = holidays.setHolidays;
  app = (await import('../src/app')).default;
});

beforeEach(() => {
  (pool.query as jest.Mock).mockReset();
  (pool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  setHolidays(new Map());
});

describe('Past slot filtering', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-18T13:00:00-06:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('omits past slots for current day', async () => {
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.includes('FROM holidays')) return Promise.resolve({ rowCount: 0, rows: [] });
      if (sql.startsWith('SELECT id, start_time'))
        return Promise.resolve({
          rows: [
            { id: 1, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 10 },
            { id: 2, start_time: '13:30:00', end_time: '14:00:00', max_capacity: 10 },
          ],
        });
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).get('/api/v1/slots').query({ date: '2024-06-18' });
    expect(res.status).toBe(200);
    expect(res.body.map((s: any) => s.startTime)).toEqual(['13:30:00']);
  });

  it('omits past slots for current day within range', async () => {
    let slotCall = 0;
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.startsWith('SELECT date, slot_id, reason FROM blocked_slots')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT day_of_week, week_of_month')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT day_of_week, slot_id, reason FROM breaks')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT date, slot_id, COUNT(*)')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT id, start_time')) {
        slotCall++;
        if (slotCall === 1)
          return Promise.resolve({
            rows: [
              { id: 1, start_time: '09:00:00', end_time: '09:30:00', max_capacity: 10 },
              { id: 2, start_time: '13:30:00', end_time: '14:00:00', max_capacity: 10 },
            ],
          });
        return Promise.resolve({
          rows: [
            { id: 3, start_time: '09:00:00', end_time: '09:30:00', max_capacity: 10 },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .get('/api/v1/slots/range')
      .query({ start: '2024-06-18', days: 2 });
    expect(res.status).toBe(200);
    expect(res.body[0].date).toBe('2024-06-18');
    expect(res.body[0].slots.map((s: any) => s.startTime)).toEqual(['13:30:00']);
  });

  it('includes past slots for current day when includePast=true', async () => {
      (pool.query as jest.Mock).mockImplementation((sql: string) => {
        if (sql.includes('FROM holidays')) return Promise.resolve({ rowCount: 0, rows: [] });
        if (sql.startsWith('SELECT id, start_time'))
          return Promise.resolve({
            rows: [
              { id: 1, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 10 },
              { id: 2, start_time: '13:30:00', end_time: '14:00:00', max_capacity: 10 },
            ],
          });
        return Promise.resolve({ rows: [] });
      });

    const res = await request(app)
      .get('/api/v1/slots')
      .query({ date: '2024-06-18', includePast: 'true' });
    expect(res.status).toBe(200);
    expect(res.body.map((s: any) => s.startTime)).toEqual([
      '09:30:00',
      '13:30:00',
    ]);
  });

  it('includes past slots within range when includePast=true', async () => {
    let slotCall = 0;
    (pool.query as jest.Mock).mockImplementation((sql: string) => {
      if (sql.startsWith('SELECT date, slot_id, reason FROM blocked_slots')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT day_of_week, week_of_month')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT day_of_week, slot_id, reason FROM breaks')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT date, slot_id, COUNT(*)')) return Promise.resolve({ rows: [] });
      if (sql.startsWith('SELECT id, start_time')) {
        slotCall++;
        if (slotCall === 1)
          return Promise.resolve({
            rows: [
              { id: 1, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 10 },
              { id: 2, start_time: '13:30:00', end_time: '14:00:00', max_capacity: 10 },
            ],
          });
        return Promise.resolve({
          rows: [
            { id: 3, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 10 },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .get('/api/v1/slots/range')
      .query({ start: '2024-06-18', days: 2, includePast: 'true' });
    expect(res.status).toBe(200);
    expect(res.body[0].date).toBe('2024-06-18');
    expect(res.body[0].slots.map((s: any) => s.startTime)).toEqual([
      '09:30:00',
      '13:30:00',
    ]);
  });
});
