import request from 'supertest';
import express from 'express';
import volunteerRolesRouter from '../src/routes/volunteer/volunteerRoles';
import pool from '../src/db';
import { setHolidays } from '../src/utils/holidayCache';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 1, role: 'volunteer' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-roles', volunteerRolesRouter);

describe('GET /volunteer-roles/mine', () => {
  beforeEach(() => {
    setHolidays(null);
  });

  it('excludes restricted categories on weekends', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            role_id: 1,
            name: 'Pantry Helper',
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 5,
            category_id: 1,
            is_wednesday_slot: false,
            is_active: true,
            category_name: 'Pantry',
            booked: '0',
          },
        ],
      });

    const res = await request(app)
      .get('/volunteer-roles/mine')
      .query({ date: '2025-01-04' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('allows gardening roles on weekends', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            role_id: 1,
            name: 'Garden Helper',
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 3,
            category_id: 3,
            is_wednesday_slot: false,
            is_active: true,
            category_name: 'Gardening',
            booked: '0',
            date: '2025-01-04',
          },
        ],
      });

    const res = await request(app)
      .get('/volunteer-roles/mine')
      .query({ date: '2025-01-04' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 1,
        role_id: 1,
        name: 'Garden Helper',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 3,
        category_id: 3,
        is_wednesday_slot: false,
        is_active: true,
        category_name: 'Gardening',
        booked: 0,
        available: 3,
        status: 'available',
        date: '2025-01-04',
      },
    ]);
  });

  it('excludes restricted categories on holidays', async () => {
    setHolidays(new Map([['2025-01-01', '']]));
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ role_id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            role_id: 1,
            name: 'Pantry Helper',
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 5,
            category_id: 1,
            is_wednesday_slot: false,
            is_active: true,
            category_name: 'Pantry',
            booked: '0',
          },
        ],
      });

    const res = await request(app)
      .get('/volunteer-roles/mine')
      .query({ date: '2025-01-01' });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(res.body).toEqual([]);
  });

  it('returns 400 for malformed date', async () => {
    const res = await request(app)
      .get('/volunteer-roles/mine')
      .query({ date: '20250101' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid date');
    expect(pool.query).not.toHaveBeenCalled();
  });
});
