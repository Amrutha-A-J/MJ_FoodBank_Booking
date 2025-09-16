import request from 'supertest';
import express from 'express';
import adminStaffRouter from '../../../src/routes/admin/adminStaff';
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  searchStaff,
} from '../../../src/controllers/admin/adminStaffController';
import mockDb from '../../utils/mockDb';

jest.mock('../../../src/utils/passwordSetupUtils', () => {
  const actual = jest.requireActual('../../../src/utils/passwordSetupUtils');
  return {
    ...actual,
    generatePasswordSetupToken: jest.fn(),
    buildPasswordSetupEmailParams: jest.fn().mockReturnValue({}),
  };
});

jest.mock('../../../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));

jest.mock('../../../src/middleware/authMiddleware', () => {
  let mockUser: any = { id: 1, role: 'staff', access: ['admin'] };
  return {
    __esModule: true,
    __setMockAuthUser: (user: any) => {
      mockUser = user;
    },
    authMiddleware: (
      req: any,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (!mockUser) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      req.user = mockUser;
      next();
    },
    authorizeRoles: (...roles: string[]) => (
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (!mockUser) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (!roles.includes(mockUser.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    },
    authorizeAccess: (...access: string[]) => (
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (!mockUser) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (!access.some(a => (mockUser.access || []).includes(a))) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    },
  };
});

const { __setMockAuthUser } = jest.requireMock(
  '../../../src/middleware/authMiddleware',
) as { __setMockAuthUser: (user: any) => void };

const app = express();
app.use(express.json());
app.use('/admin/staff', adminStaffRouter);

describe('adminStaffController routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setMockAuthUser({ id: 1, role: 'staff', access: ['admin'] });
  });

  it('allows staff with admin access to list staff', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 7,
          first_name: 'Ann',
          last_name: 'Staff',
          email: 'ann@example.com',
          access: ['admin'],
        },
      ],
      rowCount: 1,
    });

    const res = await request(app).get('/admin/staff');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 7,
        firstName: 'Ann',
        lastName: 'Staff',
        email: 'ann@example.com',
        access: ['admin'],
      },
    ]);
  });

  it('rejects staff without admin access', async () => {
    __setMockAuthUser({ id: 2, role: 'staff', access: ['pantry'] });

    const res = await request(app).get('/admin/staff');

    expect(res.status).toBe(403);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('rejects creation when email already exists', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post('/admin/staff')
      .send({
        firstName: 'Ann',
        lastName: 'Staff',
        email: 'ann@example.com',
        access: ['pantry'],
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Email already exists' });
    expect(mockDb.query).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when updating a missing staff record', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .put('/admin/staff/42')
      .send({
        firstName: 'Ann',
        lastName: 'Staff',
        email: 'ann@example.com',
        access: ['pantry'],
      });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Staff not found' });
  });

  it('returns 404 when deleting a missing staff record', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).delete('/admin/staff/99');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Staff not found' });
  });

  it('applies pagination parameters when listing staff', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get('/admin/staff')
      .query({ limit: '10', offset: '5' });

    expect(res.status).toBe(200);
    const [sql, params] = (mockDb.query as jest.Mock).mock.calls[0];
    expect(sql).toContain('LIMIT $1 OFFSET $2');
    expect(params).toEqual([10, 5]);
  });

  it('returns 400 for invalid pagination', async () => {
    const res = await request(app)
      .get('/admin/staff')
      .query({ limit: 'foo' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid limit' });
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('returns empty search results for short terms', async () => {
    const res = await request(app)
      .get('/admin/staff/search')
      .query({ search: 'ab' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('trims search terms before querying', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 5,
          first_name: 'Bob',
          last_name: 'Builder',
          email: 'bob@example.com',
          access: ['warehouse'],
        },
      ],
      rowCount: 1,
    });

    const res = await request(app)
      .get('/admin/staff/search')
      .query({ search: '  Bob  ' });

    expect(res.status).toBe(200);
    const [, params] = (mockDb.query as jest.Mock).mock.calls[0];
    expect(params).toEqual(['%Bob%']);
    expect(res.body).toEqual([
      {
        id: 5,
        firstName: 'Bob',
        lastName: 'Builder',
        email: 'bob@example.com',
        access: ['warehouse'],
      },
    ]);
  });
});

describe('adminStaffController error handling', () => {
  const createRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  it('forwards errors when listing staff fails', async () => {
    const error = new Error('list failed');
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);
    const req = { query: {} } as any;
    const res = createRes();
    const next = jest.fn();

    await listStaff(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards errors when creating staff fails', async () => {
    const error = new Error('create failed');
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);
    const req = {
      body: {
        firstName: 'Ann',
        lastName: 'Staff',
        email: 'ann@example.com',
        access: ['pantry'],
      },
    } as any;
    const res = createRes();
    const next = jest.fn();

    await createStaff(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards errors when updating staff fails', async () => {
    const error = new Error('update failed');
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);
    const req = {
      params: { id: '7' },
      body: {
        firstName: 'Ann',
        lastName: 'Staff',
        email: 'ann@example.com',
        access: ['pantry'],
      },
    } as any;
    const res = createRes();
    const next = jest.fn();

    await updateStaff(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards errors when deleting staff fails', async () => {
    const error = new Error('delete failed');
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);
    const req = { params: { id: '3' } } as any;
    const res = createRes();
    const next = jest.fn();

    await deleteStaff(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards errors when searching staff fails', async () => {
    const error = new Error('search failed');
    (mockDb.query as jest.Mock).mockRejectedValueOnce(error);
    const req = { query: { search: 'Alice' } } as any;
    const res = createRes();
    const next = jest.fn();

    await searchStaff(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
