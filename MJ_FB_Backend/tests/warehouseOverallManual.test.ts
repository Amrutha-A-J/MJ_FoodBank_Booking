import request from 'supertest';
import express from 'express';
import warehouseOverallRoutes from '../src/routes/warehouse/warehouseOverall';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/warehouse-overall', warehouseOverallRoutes);
const year = new Date().getFullYear();

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /warehouse-overall/manual', () => {
  it('inserts manual aggregate', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 't@example.com', role: 'staff' }],
      })
      .mockResolvedValueOnce({});

    const body = {
      year,
      month: 5,
      donations: 10,
      surplus: 2,
      pigPound: 1,
      outgoingDonations: 3,
    };

    const res = await request(app)
      .post('/warehouse-overall/manual')
      .set('Authorization', 'Bearer token')
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Saved' });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO warehouse_overall'),
      [year, 5, 10, 2, 1, 3],
    );
  });

  it('updates manual aggregate', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 't@example.com', role: 'staff' }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await request(app)
      .post('/warehouse-overall/manual')
      .set('Authorization', 'Bearer token')
      .send({ year, month: 5, donations: 1, surplus: 2, pigPound: 3, outgoingDonations: 4 });

    const res = await request(app)
      .post('/warehouse-overall/manual')
      .set('Authorization', 'Bearer token')
      .send({ year, month: 5, donations: 5, surplus: 6, pigPound: 7, outgoingDonations: 8 });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenLastCalledWith(
      expect.any(String),
      [year, 5, 5, 6, 7, 8],
    );
  });

  it('requires auth', async () => {
    const res = await request(app).post('/warehouse-overall/manual');
    expect(res.status).toBe(401);
  });
});
