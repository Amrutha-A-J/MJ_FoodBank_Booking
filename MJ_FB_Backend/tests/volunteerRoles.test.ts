import request from 'supertest';
import express from 'express';
import volunteerRolesRouter from '../src/routes/volunteer/volunteerRoles';
import volunteerMasterRolesRouter from '../src/routes/volunteer/volunteerMasterRoles';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-roles', volunteerRolesRouter);
app.use('/volunteer-master-roles', volunteerMasterRolesRouter);

afterEach(() => {
  jest.clearAllMocks();
});

describe('Volunteer roles routes', () => {
  it('creates a volunteer role', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            slot_id: 5,
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 3,
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ name: 'Packing', category_id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Distribution' }] });

    const res = await request(app).post('/volunteer-roles').send({
      name: 'Packing',
      startTime: '09:00:00',
      endTime: '12:00:00',
      maxVolunteers: 3,
      categoryId: 2,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 5,
      role_id: 1,
      name: 'Packing',
      start_time: '09:00:00',
      end_time: '12:00:00',
      max_volunteers: 3,
      category_id: 2,
      is_wednesday_slot: false,
      is_active: true,
      category_name: 'Distribution',
    });
  });

  it('updates a volunteer role', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role_id: 1 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 2,
            role_id: 1,
            name: 'Packing',
            start_time: '10:00:00',
            end_time: '13:00:00',
            max_volunteers: 4,
            category_id: 2,
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ name: 'Distribution' }] });

    const res = await request(app).put('/volunteer-roles/2').send({
      name: 'Packing',
      startTime: '10:00:00',
      endTime: '13:00:00',
      maxVolunteers: 4,
      categoryId: 2,
      isWednesdaySlot: false,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 2,
      role_id: 1,
      name: 'Packing',
      start_time: '10:00:00',
      end_time: '13:00:00',
      max_volunteers: 4,
      category_id: 2,
      is_wednesday_slot: false,
      is_active: true,
      category_name: 'Distribution',
    });
  });

  it('deletes a volunteer role', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ slot_id: 5 }] });
    const res = await request(app).delete('/volunteer-roles/5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Role deleted' });
    expect(pool.query).toHaveBeenCalledWith(
      'DELETE FROM volunteer_slots WHERE slot_id = $1 RETURNING slot_id',
      ['5']
    );
  });

  it('removes roles when master role is deleted', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const delMaster = await request(app).delete('/volunteer-master-roles/2');
    expect(delMaster.status).toBe(200);

    const delRole = await request(app).delete('/volunteer-roles/5');
    expect(delRole.status).toBe(404);
    expect(delRole.body).toEqual({ message: 'Role not found' });
  });
});
