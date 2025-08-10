import request from 'supertest';
import express from 'express';
import volunteersRouter from '../src/routes/volunteers';
import pool from '../src/db';
import bcrypt from 'bcrypt';

jest.mock('../src/db');
jest.mock('bcrypt');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteers', volunteersRouter);

describe('Volunteer routes with valid role IDs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a volunteer when role IDs are valid', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // usernameCheck
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // emailCheck
      .mockResolvedValueOnce({ rowCount: 2, rows: [{ id: 1 }, { id: 2 }] }) // validRoles
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // insert volunteer
      .mockResolvedValueOnce({}); // insert trained roles
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const res = await request(app).post('/volunteers').send({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      password: 'secret',
      email: 'john@example.com',
      phone: '123',
      roleIds: [1, 2],
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 5 });
    expect((pool.query as jest.Mock).mock.calls[2][0]).toMatch(/SELECT id FROM volunteer_roles/);
  });

  it('updates trained areas when role IDs are valid', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 2, rows: [{ id: 1 }, { id: 2 }] }) // validRoles
      .mockResolvedValueOnce({}) // delete existing roles
      .mockResolvedValueOnce({}); // insert new roles

    const res = await request(app)
      .put('/volunteers/1/trained-areas')
      .send({ roleIds: [1, 2] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, roleIds: [1, 2] });
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(/SELECT id FROM volunteer_roles/);
  });
});
