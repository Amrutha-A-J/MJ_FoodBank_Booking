import '../tests/utils/mockDb';
import request from 'supertest';
import express from 'express';
import volunteerMasterRolesRouter from '../src/routes/volunteer/volunteerMasterRoles';
import volunteerRolesRouter from '../src/routes/volunteer/volunteerRoles';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-master-roles', volunteerMasterRolesRouter);
app.use('/volunteer-roles', volunteerRolesRouter);

afterEach(() => {
  jest.clearAllMocks();
});

describe('Volunteer master roles routes', () => {
  it('creates a master role', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1, name: 'Prep' }] });
    const res = await request(app).post('/volunteer-master-roles').send({ name: 'Prep' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, name: 'Prep' });
    expect(pool.query).toHaveBeenCalledWith(
      'INSERT INTO volunteer_master_roles (name) VALUES ($1) RETURNING id, name',
      ['Prep']
    );
  });

  it('updates a master role', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2, name: 'Updated' }] });
    const res = await request(app).put('/volunteer-master-roles/2').send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 2, name: 'Updated' });
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE volunteer_master_roles SET name=$1 WHERE id=$2 RETURNING id, name',
      ['Updated', '2']
    );
  });

  it('deletes a master role and cascades to volunteer roles', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 3 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const delMaster = await request(app).delete('/volunteer-master-roles/3');
    expect(delMaster.status).toBe(200);
    expect(delMaster.body).toEqual({ message: 'Master role deleted' });

    const delRole = await request(app).delete('/volunteer-roles/9');
    expect(delRole.status).toBe(404);
    expect(delRole.body).toEqual({ message: 'Role not found' });

    expect((pool.query as jest.Mock).mock.calls[0]).toEqual([
      'DELETE FROM volunteer_master_roles WHERE id=$1 RETURNING id',
      ['3'],
    ]);
    expect((pool.query as jest.Mock).mock.calls[1]).toEqual([
      'DELETE FROM volunteer_slots WHERE slot_id = $1 RETURNING slot_id',
      ['9'],
    ]);
  });
});
