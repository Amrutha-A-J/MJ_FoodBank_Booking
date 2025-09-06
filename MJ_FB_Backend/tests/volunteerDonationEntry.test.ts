import request from 'supertest';
import express from 'express';
import volunteersRouter from '../src/routes/volunteer/volunteers';
import pool from '../src/db';
import bcrypt from 'bcrypt';

jest.mock('../src/db');
jest.mock('bcrypt');
jest.mock('../src/utils/authUtils', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ token: 'tok', refreshToken: 'ref' }),
}));

const app = express();
app.use(express.json());
app.use('/volunteers', volunteersRouter);

describe('donation entry volunteer login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns donation_entry access when trained for Donation Entry role', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          id: 1,
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
          password: 'hashed',
          user_id: null,
          user_role: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ name: 'Donation Entry' }] });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post('/volunteers/login')
      .send({ email: 'jane@example.com', password: 'pw' });

    expect(res.status).toBe(200);
    expect(res.body.access).toEqual(['donation_entry']);
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/WHERE v.email = \$1/);
  });
});
