import request from 'supertest';
import express from 'express';
import volunteersRouter from '../src/routes/volunteer/volunteers';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generatePasswordSetupToken } from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import config from '../src/config';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../src/utils/passwordSetupUtils');
jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
}));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).user = { id: 1, role: 'volunteer' };
  next();
});
app.use('/volunteers', volunteersRouter);

describe('Volunteer routes role ID validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a volunteer when role IDs are valid', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // emailCheck
      .mockResolvedValueOnce({ rowCount: 2, rows: [{ id: 1 }, { id: 2 }] }) // validRoles
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // insert volunteer
      .mockResolvedValueOnce({}); // insert trained roles
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');

    const res = await request(app).post('/volunteers').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '123',
      roleIds: [1, 2],
      onlineAccess: true,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 5 });
    expect((pool.query as jest.Mock).mock.calls[1][0]).toMatch(/SELECT id FROM volunteer_roles/);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('volunteers', 5);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
    );
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
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] }); // validRoles
    const res = await request(app).post('/volunteers').send({
      firstName: 'John',
      lastName: 'Doe',
      roleIds: [1, 2],
      onlineAccess: false,
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid roleIds', invalidIds: [2] });
  });

  it('requires email when online access enabled', async () => {
    const res = await request(app).post('/volunteers').send({
      firstName: 'Jane',
      lastName: 'Doe',
      roleIds: [1],
      onlineAccess: true,
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Email required for online account' });
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
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');

    const res = await request(app)
      .post('/volunteers/1/shopper')
      .send({ clientId: 123 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ userId: 9 });
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('clients', 123);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
    );
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
          email: 'john@example.com',
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
      .send({ email: 'john@example.com', password: 'Secret1!' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: 'volunteer',
      name: 'John Doe',
      userId: 9,
      userRole: 'shopper',
      token: 'token',
      refreshToken: 'token',
      access: [],
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

describe('Volunteer badges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns computed badges', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // manual badges
      .mockResolvedValueOnce({ rowCount: 1 }) // early bird
      .mockResolvedValueOnce({ rows: [{ lifetime_hours: '0', month_hours: '0', total_shifts: '10' }] }) // stats
      .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // heavy lifter
      .mockResolvedValueOnce({ rows: [] }) // weeks
      .mockResolvedValueOnce({ rows: [{ families_served: '0', pounds_handled: '0', month_families_served: '0', month_pounds_handled: '0' }] }); // contributions

    const res = await request(app).get('/volunteers/me/stats');
    expect(res.status).toBe(200);
    expect(res.body.badges).toEqual(['early-bird', 'heavy-lifter']);
    const queries = (pool.query as jest.Mock).mock.calls.map(c => c[0]);
    expect(queries[1]).toContain("status = 'completed'");
    expect(queries[2]).toContain("status = 'completed'");
    expect(queries[3]).toContain("status = 'completed'");
    expect(queries[4]).toContain("status = 'completed'");
  });

  it('awards a badge', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({});
    const res = await request(app)
      .post('/volunteers/me/badges')
      .send({ badgeCode: 'helper' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ badgeCode: 'helper' });
  });
});
