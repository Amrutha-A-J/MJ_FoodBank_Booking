import request from 'supertest';
import express from 'express';
import breaksRouter from '../src/routes/breaks';
import pool from '../src/db';

let mockUser: any;

jest.mock('../src/middleware/authMiddleware', () => ({
  __esModule: true,
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = mockUser;
    next();
  }),
  authorizeRoles: (...roles: string[]) =>
    (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return next();
    },
}));

const app = express();
app.use(express.json());
app.use('/breaks', breaksRouter);

describe('breaks routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'staff-1', role: 'staff', type: 'staff' };
  });

  describe('GET /breaks', () => {
    it('returns the list of breaks for staff users', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { day_of_week: '1', slot_id: '2', reason: null },
          { day_of_week: 5, slot_id: 7, reason: 'Inventory count' },
        ],
        rowCount: 2,
      });

      const res = await request(app).get('/breaks');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { dayOfWeek: 1, slotId: 2, reason: '' },
        { dayOfWeek: 5, slotId: 7, reason: 'Inventory count' },
      ]);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT day_of_week, slot_id, reason FROM breaks',
      );
    });
  });

  describe('POST /breaks', () => {
    it('creates or updates a break slot for staff users', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/breaks')
        .send({ dayOfWeek: 2, slotId: 9, reason: 'Volunteer training' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Added' });
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO breaks (day_of_week, slot_id, reason) VALUES ($1, $2, $3) ON CONFLICT (day_of_week, slot_id) DO UPDATE SET reason = EXCLUDED.reason',
        [2, 9, 'Volunteer training'],
      );
    });

    it('normalizes a missing reason to null before inserting', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/breaks')
        .send({ dayOfWeek: 6, slotId: 3 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Added' });
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO breaks (day_of_week, slot_id, reason) VALUES ($1, $2, $3) ON CONFLICT (day_of_week, slot_id) DO UPDATE SET reason = EXCLUDED.reason',
        [6, 3, null],
      );
    });

    it('returns 400 when dayOfWeek or slotId is missing', async () => {
      const res = await request(app)
        .post('/breaks')
        .send({ dayOfWeek: 4 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'dayOfWeek and slotId required' });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /breaks/:day/:slotId', () => {
    it('removes a break for staff users', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app).delete('/breaks/3/11');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Removed' });
      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM breaks WHERE day_of_week = $1 AND slot_id = $2',
        ['3', '11'],
      );
    });
  });

  describe('authorization', () => {
    it('returns 403 for non-staff users', async () => {
      mockUser = { id: 'client-9', role: 'client', type: 'user' };

      const res = await request(app).get('/breaks');

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: 'Forbidden' });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
