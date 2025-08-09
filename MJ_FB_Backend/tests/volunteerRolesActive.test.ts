import request from 'supertest';
import express from 'express';
import volunteerRolesRouter from '../src/routes/volunteerRoles';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-roles', volunteerRolesRouter);

describe('Volunteer roles activation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates role activation status', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            name: 'Role',
            start_time: '09:00:00',
            end_time: '12:00:00',
            max_volunteers: 1,
            category_id: 1,
            is_wednesday_slot: false,
            is_active: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ name: 'Pantry' }] });
    const res = await request(app).patch('/volunteer-roles/1').send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });

  it('filters inactive roles from list', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    await request(app).get('/volunteer-roles');
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/WHERE vr\.is_active/);
  });
});
