import request from 'supertest';
import express from 'express';
import adminStaffRouter from '../src/routes/admin/adminStaff';
import pool from '../src/db';
import { generatePasswordSetupToken } from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import config from '../src/config';

jest.mock('../src/db');
jest.mock('../src/utils/passwordSetupUtils');
jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: 1, role: 'staff', access: ['admin'] };
    next();
  },
  authorizeRoles: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  authorizeAccess: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

const app = express();
app.use(express.json());
app.use('/admin/staff', adminStaffRouter);

describe('POST /admin/staff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
});
