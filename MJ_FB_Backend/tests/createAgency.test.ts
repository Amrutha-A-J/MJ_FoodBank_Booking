import '../tests/utils/mockDb';
import request from 'supertest';
import express from 'express';
import agenciesRoutes from '../src/routes/agencies';
import pool from '../src/db';
import { generatePasswordSetupToken } from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import config from '../src/config';

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
    const role = req.headers['x-role'] as string;
    req.user = { id: '1', role: role || 'staff' };
    next();
  },
  authorizeRoles: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

const app = express();
app.use(express.json());
app.use('/agencies', agenciesRoutes);
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status || 500).json({ message: err.message });
  },
);

describe('POST /agencies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates agency for staff user', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [{ id: 5, name: 'A', email: 'a@a.com', password: null, contact_info: null }],
        rowCount: 1,
      });
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');

    const res = await request(app)
      .post('/agencies')
      .send({ name: 'A', email: 'a@a.com', password: 'Secret123!' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 5);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('agencies', 5);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
    );
  });

  it('rejects non-staff user', async () => {
    const res = await request(app)
      .post('/agencies')
      .set('x-role', 'agency')
      .send({ name: 'A', email: 'a@a.com' });

    expect(res.status).toBe(403);
  });
});

