import mockDb from './utils/mockDb';
import {
  createVolunteerMasterRole,
  listVolunteerMasterRoles,
  deleteVolunteerMasterRole,
} from '../src/controllers/volunteer/volunteerMasterRoleController';

describe('volunteerMasterRoleController', () => {
  beforeEach(() => {
    (mockDb.query as jest.Mock).mockReset();
  });

  it('lists master roles', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1, name: 'Prep' }] });
    const res = { json: jest.fn() } as any;
    await listVolunteerMasterRoles({} as any, res, jest.fn());
    expect(mockDb.query).toHaveBeenCalledWith('SELECT id, name FROM volunteer_master_roles ORDER BY id');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'Prep' }]);
  });

  it('handles database error when listing', async () => {
    const error = new Error('db fail');
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    await listVolunteerMasterRoles({} as any, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('creates a master role', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 2, name: 'Cook' }] });
    const req = { body: { name: 'Cook' } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    await createVolunteerMasterRole(req, res, jest.fn());
    expect(mockDb.query).toHaveBeenCalledWith(
      'INSERT INTO volunteer_master_roles (name) VALUES ($1) RETURNING id, name',
      ['Cook'],
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 2, name: 'Cook' });
  });

  it('handles duplicate master role names', async () => {
    const error = { code: '23505' };
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);
    const req = { body: { name: 'Cook' } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();
    await createVolunteerMasterRole(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deletes a master role', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 3 }] });
    const req = { params: { id: '3' } } as any;
    const res = { json: jest.fn() } as any;
    await deleteVolunteerMasterRole(req, res, jest.fn());
    expect(mockDb.query).toHaveBeenCalledWith(
      'DELETE FROM volunteer_master_roles WHERE id=$1 RETURNING id',
      ['3'],
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'Master role deleted' });
  });

  it('handles database error when deleting', async () => {
    const error = new Error('db fail');
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);
    const req = { params: { id: '4' } } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();
    await deleteVolunteerMasterRole(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

