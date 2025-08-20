import request from 'supertest';
import express from 'express';
import app from '../src/app';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
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
