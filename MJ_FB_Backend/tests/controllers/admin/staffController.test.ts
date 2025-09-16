import request from 'supertest';
import express from 'express';
import staffRouter from '../../../src/routes/admin/staff';
import adminStaffRouter from '../../../src/routes/admin/adminStaff';
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

jest.mock('../../../src/utils/timesheetSeeder', () => ({
  __esModule: true,
  default: jest.fn(),
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

const seedTimesheetsMock = jest.requireMock(
  '../../../src/utils/timesheetSeeder',
).default as jest.Mock;

const { sendTemplatedEmail } = jest.requireMock(
  '../../../src/utils/emailUtils',
) as { sendTemplatedEmail: jest.Mock };

const { __setMockAuthUser } = jest.requireMock(
  '../../../src/middleware/authMiddleware',
) as { __setMockAuthUser: (user: any) => void };

const app = express();
app.use(express.json());
app.use('/staff', staffRouter);
app.use('/admin-staff', adminStaffRouter);

describe('staffController routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.query as jest.Mock).mockReset();
    (mockDb.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
    seedTimesheetsMock.mockReset();
    __setMockAuthUser({ id: 1, role: 'staff', access: ['admin'] });
  });

  it('reports when no staff records exist', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ count: '0' }],
      rowCount: 1,
    });

    const res = await request(app).get('/staff/exists');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ exists: false });
    expect(mockDb.query).toHaveBeenCalledTimes(1);
    expect((mockDb.query as jest.Mock).mock.calls[0][0]).toBe(
      'SELECT COUNT(*) FROM staff',
    );
  });

  it('reports when staff records exist', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ count: '1' }],
      rowCount: 1,
    });

    const res = await request(app).get('/staff/exists');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ exists: true });
    expect(mockDb.query).toHaveBeenCalledTimes(1);
    expect((mockDb.query as jest.Mock).mock.calls[0][0]).toBe(
      'SELECT COUNT(*) FROM staff',
    );
  });

  it('returns 400 for invalid pagination when listing staff', async () => {
    const res = await request(app)
      .get('/admin-staff')
      .query({ limit: 'foo' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid limit' });
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('rejects creation when required fields are missing', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ count: '0' }],
      rowCount: 1,
    });

    const res = await request(app)
      .post('/staff')
      .send({ firstName: 'Ann', email: 'ann@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['lastName'] }),
      ]),
    );
    expect(mockDb.query).toHaveBeenCalledTimes(1);
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
    expect(seedTimesheetsMock).not.toHaveBeenCalled();
  });

  it('rejects creation when email already exists', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2 }] });

    const res = await request(app)
      .post('/staff')
      .send({
        firstName: 'Ann',
        lastName: 'Staff',
        email: 'ann@example.com',
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Email already exists' });
    expect(mockDb.query).toHaveBeenCalledTimes(2);
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
    expect(seedTimesheetsMock).not.toHaveBeenCalled();
  });

  it('creates the first staff member with default admin access', async () => {
    (mockDb.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 });

    const res = await request(app)
      .post('/staff')
      .send({
        firstName: 'Sam',
        lastName: 'Helper',
        email: 'sam@example.com',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Staff created' });
    expect(mockDb.query).toHaveBeenCalledTimes(3);

    const insertParams = (mockDb.query as jest.Mock).mock.calls[2][1];
    expect(insertParams).toEqual([
      'Sam',
      'Helper',
      'staff',
      'sam@example.com',
      ['admin'],
    ]);
    expect(sendTemplatedEmail).toHaveBeenCalledTimes(1);
    expect(seedTimesheetsMock).toHaveBeenCalledWith(42);
  });

  it('returns 404 when deleting a missing staff record', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app).delete('/admin-staff/123');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Staff not found' });
    expect(mockDb.query).toHaveBeenCalledTimes(1);
  });

  it('blocks non-admin staff from creating new staff when records exist', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ count: '1' }],
      rowCount: 1,
    });
    __setMockAuthUser({ id: 2, role: 'staff', access: ['pantry'] });

    const res = await request(app)
      .post('/staff')
      .send({
        firstName: 'Sam',
        lastName: 'Helper',
        email: 'sam@example.com',
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Forbidden' });
    expect(mockDb.query).toHaveBeenCalledTimes(1);
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
    expect(seedTimesheetsMock).not.toHaveBeenCalled();
  });

  it('returns empty results when no search term is provided', async () => {
    const res = await request(app).get('/staff/search');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('searches staff by name or email', async () => {
    (mockDb.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 7,
          first_name: 'Ann',
          last_name: 'Staff',
        },
      ],
      rowCount: 1,
    });

    const res = await request(app)
      .get('/staff/search')
      .query({ query: 'Ann' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 7, name: 'Ann Staff' }]);
    expect(mockDb.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (mockDb.query as jest.Mock).mock.calls[0];
    expect(sql).toContain('ILIKE $1');
    expect(params).toEqual(['%Ann%']);
  });
});
