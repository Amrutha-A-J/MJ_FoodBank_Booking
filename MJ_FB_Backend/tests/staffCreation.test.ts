import request from 'supertest';
import express from 'express';
import staffRoutes from '../src/routes/admin/staff';
import pool from '../src/db';
import { generatePasswordSetupToken } from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';

jest.mock('../src/db');
jest.mock('../src/utils/passwordSetupUtils');
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
    expect(sendTemplatedEmail).toHaveBeenCalled();
  });
});

