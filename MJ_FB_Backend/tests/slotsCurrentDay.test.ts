import request from 'supertest';
import express from 'express';
import app from '../src/app';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('Past slot filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-18T13:00:00-06:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('omits past slots for current day', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, start_time: '09:00:00', end_time: '09:30:00', max_capacity: 10 },
          { id: 2, start_time: '13:30:00', end_time: '14:00:00', max_capacity: 10 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/slots').query({ date: '2024-06-18' });
    expect(res.status).toBe(200);
    expect(res.body.map((s: any) => s.startTime)).toEqual(['13:30:00']);
  });

  it('omits past slots for current day within range', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          { id: 1, start_time: '09:00:00', end_time: '09:30:00', max_capacity: 10 },
          { id: 2, start_time: '13:30:00', end_time: '14:00:00', max_capacity: 10 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 3, start_time: '09:00:00', end_time: '09:30:00', max_capacity: 10 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/slots/range')
      .query({ start: '2024-06-18', days: 2 });
    expect(res.status).toBe(200);
    expect(res.body[0].date).toBe('2024-06-18');
    expect(res.body[0].slots.map((s: any) => s.startTime)).toEqual(['13:30:00']);
  });
});
