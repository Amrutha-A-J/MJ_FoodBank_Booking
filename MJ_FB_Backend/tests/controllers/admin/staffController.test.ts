import express from 'express';
import request from 'supertest';
import pool from '../../../src/db';
import {
  listStaff,
  createStaff,
  deleteStaff,
} from '../../../src/controllers/admin/adminStaffController';
import adminStaffRouter from '../../../src/routes/admin/adminStaff';
import { sendTemplatedEmail } from '../../../src/utils/emailUtils';
import { __setMockAuthUser } from '../../../src/middleware/authMiddleware';

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
};

jest.mock('../../../src/db');
jest.mock('../../../src/utils/passwordSetupUtils', () => {
  const actual = jest.requireActual('../../../src/utils/passwordSetupUtils');
  return {
    __esModule: true,
    ...actual,
    generatePasswordSetupToken: jest.fn(),
    verifyPasswordSetupToken: jest.fn(),
    markPasswordTokenUsed: jest.fn(),
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
      if (!mockUser || !roles.includes(mockUser.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    },
    authorizeAccess: (...access: string[]) => (
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (
        !mockUser ||
        !access.some(a => (mockUser.access || []).includes(a))
      ) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    },
  };
});

const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>;

const app = express();
app.use(express.json());
app.use('/admin-staff', adminStaffRouter);

function createMockRes(): MockResponse & express.Response {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  __setMockAuthUser({ id: 1, role: 'staff', access: ['admin'] });
});

describe('adminStaffController listStaff', () => {
  it('returns 400 when limit is invalid', async () => {
    const req: any = { query: { limit: 'abc' } };
    const res = createMockRes();
    const next = jest.fn();

    await listStaff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid limit' });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when offset is invalid', async () => {
    const req: any = { query: { offset: '-5' } };
    const res = createMockRes();
    const next = jest.fn();

    await listStaff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid offset' });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('adminStaffController createStaff validation', () => {
  it('returns 400 when required fields are missing', async () => {
    const req: any = { body: { firstName: 'Alice' } };
    const res = createMockRes();
    const next = jest.fn();

    await createStaff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: expect.any(Array) }),
    );
    expect(mockQuery).not.toHaveBeenCalled();
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when email already exists', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] } as any);

    const req: any = {
      body: {
        firstName: 'Alice',
        lastName: 'Baker',
        email: 'alice@example.com',
        access: ['pantry'],
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    await createStaff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email already exists' });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('adminStaffController deleteStaff', () => {
  it('returns 404 when staff member is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 } as any);

    const req: any = { params: { id: '99' } };
    const res = createMockRes();
    const next = jest.fn();

    await deleteStaff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Staff not found' });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('adminStaffRoutes authorization', () => {
  it('rejects non-admin staff from listing staff members', async () => {
    __setMockAuthUser({ id: 2, role: 'staff', access: [] });

    const res = await request(app).get('/admin-staff');

    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
