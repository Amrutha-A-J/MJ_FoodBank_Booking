import request from 'supertest';
import express from 'express';
import staffRoutes from '../src/routes/staff';
import pool from '../src/db';
import bcrypt from 'bcrypt';

jest.mock('../src/db');
jest.mock('bcrypt');

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
      .mockResolvedValueOnce({}); // insert
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const res = await request(app)
      .post('/staff')
      .send({
        firstName: 'Admin',
        lastName: 'Admin',
        email: 'harvestpantry@mjfoodbank.org',
        password: 'Abcd12345',
        access: ['admin'],
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Staff created' });
  });
});

