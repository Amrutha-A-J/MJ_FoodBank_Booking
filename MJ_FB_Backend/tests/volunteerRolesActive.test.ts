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

describe('Volunteer roles activation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates role activation status', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 1,
          role_id: 1,
          name: 'Role',
          start_time: '09:00:00',
          end_time: '12:00:00',
          max_volunteers: 1,
          category_id: 1,
          is_wednesday_slot: false,
          is_active: false,
          category_name: 'Pantry',
        },
      ],
    });
    const res = await request(app).patch('/volunteer-roles/1').send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });

  it('lists active roles with shifts', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          role_id: 1,
          category_id: 1,
          name: 'Role',
          max_volunteers: 1,
          category_name: 'Pantry',
          shifts: [
            {
              id: 10,
              start_time: '09:00:00',
              end_time: '12:00:00',
              is_wednesday_slot: false,
              is_active: true,
            },
          ],
        },
      ],
    });
    const res = await request(app).get('/volunteer-roles');
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/WHERE vs\.is_active/);
    expect(res.body).toEqual([
      {
        id: 1,
        role_id: 1,
        category_id: 1,
        name: 'Role',
        max_volunteers: 1,
        category_name: 'Pantry',
        shifts: [
          {
            id: 10,
            start_time: '09:00:00',
            end_time: '12:00:00',
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      },
    ]);
  });
});

describe('add volunteer role', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates slot for existing role via roleId', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            slot_id: 10,
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 1,
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ name: 'Role', category_id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Pantry' }] });

    const res = await request(app)
      .post('/volunteer-roles')
      .send({ roleId: 1, startTime: '09:00:00', endTime: '12:00:00', maxVolunteers: 1 });

    expect(res.status).toBe(201);
    expect((pool.query as jest.Mock).mock.calls.length).toBe(3);
    expect(res.body.role_id).toBe(1);
  });

  it('creates new role with name and category', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            slot_id: 11,
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 1,
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ name: 'New Role', category_id: 3 }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Pantry' }] });

    const res = await request(app)
      .post('/volunteer-roles')
      .send({
        name: 'New Role',
        categoryId: 3,
        startTime: '09:00:00',
        endTime: '12:00:00',
        maxVolunteers: 1,
      });

    expect(res.status).toBe(201);
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(
      /WHERE name=\$1 AND category_id=\$2/
    );
    expect(res.body.role_id).toBe(2);
  });
});
