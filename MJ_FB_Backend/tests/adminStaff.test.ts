import request from 'supertest';
import express from 'express';
import adminStaffRouter from '../src/routes/admin/adminStaff';
import pool from '../src/db';
import { generatePasswordSetupToken } from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import config from '../src/config';
import { __setMockAuthUser } from '../src/middleware/authMiddleware';

jest.mock('../src/utils/passwordSetupUtils', () => {
  const actual = jest.requireActual('../src/utils/passwordSetupUtils');
  return {
    ...actual,
    generatePasswordSetupToken: jest.fn(),
    verifyPasswordSetupToken: jest.fn(),
    markPasswordTokenUsed: jest.fn(),
  };
});
jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => {
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
      if (!mockUser) return res.status(401).json({ message: 'Unauthorized' });
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

const app = express();
app.use(express.json());
app.use('/admin/staff', adminStaffRouter);

beforeEach(() => {
  jest.clearAllMocks();
  __setMockAuthUser({ id: 1, role: 'staff', access: ['admin'] });
});

describe('POST /admin/staff', () => {
  it('creates staff and sends setup email', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // email check
      .mockResolvedValueOnce({ rows: [{ id: 8 }] }); // insert
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');

    const res = await request(app)
      .post('/admin/staff')
      .send({ firstName: 'A', lastName: 'B', email: 'a@b.com', access: ['pantry'], password: 'Secret123!' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Staff created' });
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('staff', 8);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
    );
  });

  it('requires admin access', async () => {
    __setMockAuthUser({ id: 2, role: 'staff', access: [] });
    const res = await request(app)
      .post('/admin/staff')
      .send({ firstName: 'A', lastName: 'B', email: 'a@b.com' });
    expect(res.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('GET /admin/staff', () => {
  it('lists staff', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          first_name: 'A',
          last_name: 'B',
          email: 'a@b.com',
          access: ['pantry'],
        },
      ],
    });

    const res = await request(app).get('/admin/staff');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, firstName: 'A', lastName: 'B', email: 'a@b.com', access: ['pantry'] },
    ]);
  });

  it('requires authentication', async () => {
    __setMockAuthUser(null);
    const res = await request(app).get('/admin/staff');
    expect(res.status).toBe(401);
  });

  it('requires staff role', async () => {
    __setMockAuthUser({ id: 3, role: 'volunteer', access: [] });
    const res = await request(app).get('/admin/staff');
    expect(res.status).toBe(403);
  });

  it('requires admin access', async () => {
    __setMockAuthUser({ id: 4, role: 'staff', access: [] });
    const res = await request(app).get('/admin/staff');
    expect(res.status).toBe(403);
  });
});

describe('PUT /admin/staff/:id', () => {
  it('updates staff', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app)
      .put('/admin/staff/5')
      .send({ firstName: 'A', lastName: 'B', email: 'a@b.com', access: ['pantry'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Staff updated' });
  });

  it('returns 404 for missing staff', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app)
      .put('/admin/staff/99')
      .send({ firstName: 'A', lastName: 'B', email: 'a@b.com', access: ['pantry'] });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Staff not found' });
  });

  it('requires admin access', async () => {
    __setMockAuthUser({ id: 4, role: 'staff', access: [] });
    const res = await request(app)
      .put('/admin/staff/5')
      .send({ firstName: 'A', lastName: 'B', email: 'a@b.com', access: ['pantry'] });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /admin/staff/:id', () => {
  it('deletes staff', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app).delete('/admin/staff/5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Staff deleted' });
  });

  it('returns 404 for missing staff', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
    const res = await request(app).delete('/admin/staff/99');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Staff not found' });
  });

  it('requires admin access', async () => {
    __setMockAuthUser({ id: 4, role: 'staff', access: [] });
    const res = await request(app).delete('/admin/staff/5');
    expect(res.status).toBe(403);
  });
});
