import request from 'supertest';
import express from 'express';
import volunteersRouter from '../src/routes/volunteers';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../src/db');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteers', volunteersRouter);

describe('Volunteer routes role ID validation', () => {
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

  it('returns invalid role IDs when creating volunteer', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // usernameCheck
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] }); // validRoles
    const res = await request(app).post('/volunteers').send({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      password: 'secret',
      roleIds: [1, 2],
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid roleIds', invalidIds: [2] });
  });

  it('returns invalid role IDs when updating trained areas', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] }); // validRoles
    const res = await request(app)
      .put('/volunteers/1/trained-areas')
      .send({ roleIds: [1, 2] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid roleIds', invalidIds: [2] });
  });
});

describe('Volunteer shopper profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a shopper profile for a volunteer', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ first_name: 'John', last_name: 'Doe', email: 'j@e.com', phone: '123' }],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 9 }] })
      .mockResolvedValueOnce({});
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const res = await request(app)
      .post('/volunteers/1/shopper')
      .send({ clientId: 123, password: 'pass' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ userId: 9 });
  });

  it('removes a shopper profile for a volunteer', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 9 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await request(app).delete('/volunteers/1/shopper');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Shopper profile removed' });
  });
});

describe('Volunteer login with shopper profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes shopper info in token and response', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          username: 'john',
          password: 'hashed',
          user_id: 9,
          user_role: 'shopper',
        },
      ],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/volunteers/login')
      .send({ username: 'john', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: 'volunteer',
      name: 'John Doe',
      userId: 9,
      userRole: 'shopper',
    });
    expect((jwt.sign as jest.Mock).mock.calls[0][0]).toMatchObject({
      id: 1,
      role: 'volunteer',
      type: 'volunteer',
      userId: 9,
      userRole: 'shopper',
    });
  });
});
