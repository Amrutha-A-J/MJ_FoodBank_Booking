import request from 'supertest';
import express from 'express';
import rolesRouter from '../src/routes/roles';
import pool from '../src/db';
import logger from '../src/utils/logger';

const app = express();
app.use(express.json());
app.use('/roles', rolesRouter);
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(500).json({ message: 'Internal server error' });
  },
);

afterEach(() => {
  jest.clearAllMocks();
});

describe('roles routes', () => {
  it('returns grouped roles', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { category_id: 1, category_name: 'Warehouse', role_id: 2, role_name: 'Stocker' },
        { category_id: 1, category_name: 'Warehouse', role_id: 3, role_name: 'Loader' },
      ],
    });
    const res = await request(app).get('/roles');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { categoryId: 1, categoryName: 'Warehouse', roleId: 2, roleName: 'Stocker' },
      { categoryId: 1, categoryName: 'Warehouse', roleId: 3, roleName: 'Loader' },
    ]);
  });

  it('returns shift data for a role', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { shift_id: 5, start_time: '09:00:00', end_time: '12:00:00', max_volunteers: 4 },
      ],
    });
    const res = await request(app).get('/roles/1/shifts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { shiftId: 5, startTime: '09:00:00', endTime: '12:00:00', maxVolunteers: 4 },
    ]);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1]);
  });

  it('returns 400 on invalid roleId', async () => {
    const res = await request(app).get('/roles/abc/shifts');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid roleId' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('logs error when database query fails', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('db fail'));
    const res = await request(app).get('/roles/1/shifts');
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      'GET /roles/:roleId/shifts - Failed to fetch shifts',
      {
        params: { roleId: '1' },
        query: {},
        error: expect.any(Error),
      },
    );
  });
});

