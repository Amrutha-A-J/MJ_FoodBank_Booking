import request from 'supertest';
import express from 'express';
import volunteerRolesRouter from '../src/routes/volunteer/volunteerRoles';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-roles', volunteerRolesRouter);

describe('addVolunteerRole validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires roleId or name and categoryId', async () => {
    const res = await request(app).post('/volunteer-roles').send({
      startTime: '09:00:00',
      endTime: '12:00:00',
      maxVolunteers: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/provide roleId or name and categoryId/);
  });

  it('creates slot for existing roleId', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            slot_id: 1,
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 1,
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ name: 'Role', category_id: 2 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ name: 'Master' }] });

    const res = await request(app).post('/volunteer-roles').send({
      roleId: 5,
      startTime: '09:00:00',
      endTime: '12:00:00',
      maxVolunteers: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.role_id).toBe(5);
  });

  it('creates slot with new role name and categoryId', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            slot_id: 2,
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 1,
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ name: 'New', category_id: 3 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ name: 'Master' }] });

    const res = await request(app).post('/volunteer-roles').send({
      name: 'New',
      categoryId: 3,
      startTime: '09:00:00',
      endTime: '12:00:00',
      maxVolunteers: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.role_id).toBe(10);
    expect(res.body.name).toBe('New');
  });

  it('rejects overlapping slot times', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app).post('/volunteer-roles').send({
      roleId: 5,
      startTime: '09:00:00',
      endTime: '12:00:00',
      maxVolunteers: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/overlap/);
    expect((pool.query as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('returns 400 for invalid categoryId when creating new role', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app).post('/volunteer-roles').send({
      name: 'Invalid',
      categoryId: 999,
      startTime: '09:00:00',
      endTime: '12:00:00',
      maxVolunteers: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid categoryId/);
    expect((pool.query as jest.Mock).mock.calls).toHaveLength(1);
  });
});
