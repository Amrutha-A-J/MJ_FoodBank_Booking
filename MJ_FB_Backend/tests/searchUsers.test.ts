import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/users', usersRouter);

describe('GET /users/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches users with middle names in first name', async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          client_id: 1,
          first_name: 'John Paul',
          last_name: 'Smith',
          email: 'john@example.com',
          phone: '123',
          password: null,
        },
      ],
    });

    const res = await request(app)
      .get('/users/search')
      .query({ search: 'John Smith' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        name: 'John Paul Smith',
        email: 'john@example.com',
        phone: '123',
        client_id: 1,
        hasPassword: false,
      },
    ]);

    expect(pool.query).toHaveBeenCalledWith(
      `SELECT client_id, first_name, last_name, email, phone, password\n       FROM clients\n       WHERE (first_name || ' ' || last_name) ILIKE $1\n          OR email ILIKE $1\n          OR phone ILIKE $1\n          OR CAST(client_id AS TEXT) ILIKE $1\n       ORDER BY first_name, last_name ASC\n       LIMIT 5`,
      ['%John%Smith%'],
    );
  });
});

