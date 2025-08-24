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

describe('GET /slots with invalid dates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for malformed date string', async () => {
    const res = await request(app).get('/slots').query({ date: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid date');
    expect((pool.query as jest.Mock)).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid date format', async () => {
    const res = await request(app).get('/slots').query({ date: '2024-02-30abc' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid date');
    expect((pool.query as jest.Mock)).not.toHaveBeenCalled();
  });
});

describe('GET /slots applies slot rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses weekday rules', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          { id: 1, start_time: '09:00:00', end_time: '09:30:00', max_capacity: 10 },
          { id: 2, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 10 },
          { id: 3, start_time: '12:00:00', end_time: '12:30:00', max_capacity: 10 },
          { id: 4, start_time: '12:30:00', end_time: '13:00:00', max_capacity: 10 },
          { id: 5, start_time: '14:30:00', end_time: '15:00:00', max_capacity: 10 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/slots').query({ date: '2024-06-17' });
    expect(res.status).toBe(200);
    expect(res.body.map((s: any) => s.startTime)).toEqual([
      '09:30:00',
      '14:30:00',
    ]);
  });

  it('uses Wednesday rules', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          { id: 1, start_time: '09:30:00', end_time: '10:00:00', max_capacity: 10 },
          { id: 2, start_time: '15:30:00', end_time: '16:00:00', max_capacity: 10 },
          { id: 3, start_time: '18:30:00', end_time: '19:00:00', max_capacity: 10 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/slots').query({ date: '2024-06-19' });
    expect(res.status).toBe(200);
    expect(res.body.map((s: any) => s.startTime)).toEqual([
      '09:30:00',
      '18:30:00',
    ]);
  });
});
