import request from 'supertest';
import express from 'express';
import volunteerMasterRolesRouter from '../src/routes/volunteerMasterRoles';
import volunteerRolesRouter from '../src/routes/volunteerRoles';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-master-roles', volunteerMasterRolesRouter);
app.use('/volunteer-roles', volunteerRolesRouter);

describe('Volunteer master roles', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists and updates master roles', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Pantry', is_active: true }] });
    const listRes = await request(app).get('/volunteer-master-roles');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toEqual([{ id: 1, name: 'Pantry', is_active: true }]);

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, name: 'Pantry', is_active: false }] });
    const patchRes = await request(app)
      .patch('/volunteer-master-roles/1')
      .send({ isActive: false });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body).toEqual({ id: 1, name: 'Pantry', is_active: false });
  });

  it('filters inactive roles from list', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
    await request(app).get('/volunteer-roles');
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/WHERE vmr\.is_active/);
  });
});
