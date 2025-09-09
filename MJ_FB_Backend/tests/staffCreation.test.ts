import request from 'supertest';
import express from 'express';
import staffRoutes from '../src/routes/admin/staff';
import pool from '../src/db';
import { generatePasswordSetupToken } from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import config from '../src/config';

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

const app = express();
app.use(express.json());
app.use('/staff', staffRoutes);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /staff (first staff member)', () => {
  it('creates staff even when access is provided', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // check staff count
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // email check
      .mockResolvedValueOnce({ rows: [{ id: 7 }] }); // insert
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');

    const res = await request(app)
      .post('/staff')
      .send({
        firstName: 'Admin',
        lastName: 'Admin',
        email: 'harvestpantry@mjfoodbank.org',
        access: ['admin'],
        password: 'Secret123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Staff created' });
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('staff', 7);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
    );
  });
});

describe('POST /staff with new access roles', () => {
  it.each(['donor_management', 'payroll_management'])('creates staff with %s access', async role => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 7 }] });
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');

    const res = await request(app)
      .post('/staff')
      .send({
        firstName: 'A',
        lastName: 'B',
        email: `${role}@example.com`,
        access: [role],
        password: 'Secret123!',
      });

    expect(res.status).toBe(201);
  });
});

