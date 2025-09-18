import request from 'supertest';
import express from 'express';
import volunteersRouter from '../src/routes/volunteer/volunteers';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import { generatePasswordSetupToken } from '../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../src/utils/emailUtils';
import config from '../src/config';

jest.mock('bcrypt');
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
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).user = { id: 1, role: 'staff' };
  next();
});
app.use('/volunteers', volunteersRouter);

const createMockClient = () => ({
  query: jest.fn().mockResolvedValue({}),
  release: jest.fn(),
});

describe('Volunteer routes role ID validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a volunteer when role IDs are valid and sends setup link when requested', async () => {
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
      sendPasswordLink: true,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 5 });
    expect((pool.query as jest.Mock).mock.calls[1][0]).toMatch(/SELECT id FROM volunteer_roles/);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('volunteers', 5);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
    );
  });

  it('hashes password when provided and skips setup email', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // emailCheck
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] }) // validRoles
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // insert volunteer
      .mockResolvedValueOnce({}); // insert trained roles
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const res = await request(app).post('/volunteers').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '123',
      roleIds: [1],
      password: 'Secret1!',
    });

    expect(res.status).toBe(201);
    expect(bcrypt.hash).toHaveBeenCalledWith('Secret1!', 10);
    const insertCall = (pool.query as jest.Mock).mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO volunteers'),
    );
    expect(insertCall[1][4]).toBe('hashed');
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
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
    expect(res.body).toEqual({
      errors: [
        expect.objectContaining({
          message: 'Email required for online account',
          path: ['email'],
        }),
      ],
    });
  });

  it('rejects duplicate email regardless of case', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2 }] });
    const res = await request(app).post('/volunteers').send({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'John@Example.com',
      phone: '123',
      roleIds: [1],
      onlineAccess: true,
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Email already exists' });
    expect((pool.query as jest.Mock).mock.calls[0][0]).toMatch(
      /LOWER\(email\) = LOWER\(\$1\)/,
    );

  });

  it('does not create a token when email is missing', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 2, rows: [{ id: 1 }, { id: 2 }] }) // validRoles
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // insert volunteer
      .mockResolvedValueOnce({}); // insert trained roles

    const res = await request(app).post('/volunteers').send({
      firstName: 'John',
      lastName: 'Doe',
      roleIds: [1, 2],
      onlineAccess: false,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 5 });
    expect(generatePasswordSetupToken).not.toHaveBeenCalled();
    expect(sendTemplatedEmail).not.toHaveBeenCalled();

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

describe('updateVolunteer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends setup link when enabling online access', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // emailCheck
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ password: null }] }) // existing
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            first_name: 'J',
            last_name: 'D',
            email: 'john@example.com',
            phone: '123',
            password: null,
          },
        ],
      });
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');

    const res = await request(app).put('/volunteers/1').send({
      firstName: 'J',
      lastName: 'D',
      email: 'john@example.com',
      phone: '123',
      onlineAccess: true,
      sendPasswordLink: true,
    });

    expect(res.status).toBe(200);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('volunteers', 1);
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: config.passwordSetupTemplateId }),
    );
  });

  it('hashes password and stores it', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // emailCheck
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ password: null }] }) // existing
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            first_name: 'J',
            last_name: 'D',
            email: 'john@example.com',
            phone: '123',
            password: 'hashed',
          },
        ],
      });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const res = await request(app).put('/volunteers/1').send({
      firstName: 'J',
      lastName: 'D',
      email: 'john@example.com',
      phone: '123',
      password: 'Secret1!',
    });

    expect(res.status).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith('Secret1!', 10);
    const updateCall = (pool.query as jest.Mock).mock.calls[2];
    expect(updateCall[1][5]).toBe('hashed');
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
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
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // emailCheck
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // clientId check
      .mockResolvedValueOnce({ rows: [{ client_id: 9 }] }) // insert
      .mockResolvedValueOnce({}); // update
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
    expect((sendTemplatedEmail as jest.Mock).mock.calls[0][0].params.clientId).toBe(123);
  });

  it('links to existing client when email matches regardless of case', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ first_name: 'John', last_name: 'Doe', email: 'J@E.com', phone: '123' }],
      }) // volunteer
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ client_id: 5 }] }) // existing client
      .mockResolvedValueOnce({}); // update volunteer

    const res = await request(app)
      .post('/volunteers/1/shopper')
      .send({ clientId: 123 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 5 });
    expect(pool.query).toHaveBeenCalledTimes(3);
    expect((pool.query as jest.Mock).mock.calls[1][0]).toMatch(
      /LOWER\(email\) = LOWER\(\$1\)/,
    );
    expect(generatePasswordSetupToken).not.toHaveBeenCalled();
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
  });

  it('links to an existing client ID when provided', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            first_name: 'John',
            last_name: 'Doe',
            email: 'vol@example.com',
            phone: '123',
          },
        ],
      }) // volunteer
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // emailCheck
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ client_id: 123 }] }) // clientId check
      .mockResolvedValueOnce({}); // update volunteer

    const res = await request(app)
      .post('/volunteers/1/shopper')
      .send({ clientId: 123 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 123 });
    expect(pool.query).toHaveBeenCalledTimes(4);
    expect((pool.query as jest.Mock).mock.calls[3][0]).toMatch(
      /UPDATE volunteers SET user_id = \$1 WHERE id = \$2/,
    );
    expect(generatePasswordSetupToken).not.toHaveBeenCalled();
    expect(sendTemplatedEmail).not.toHaveBeenCalled();
  });

  it('returns 409 when shopper profile already exists', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'j@e.com',
          phone: '123',
          user_id: 9,
        },
      ],
    });

    const res = await request(app)
      .post('/volunteers/1/shopper')
      .send({ clientId: 123 });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: 'Shopper profile already exists' });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('removes a shopper profile for a volunteer', async () => {
    const mockClient = createMockClient();
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 9 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ profile_link: 'https://portal.link2feed.ca/org/1605/intake/9' }],
      });

    const res = await request(app).delete('/volunteers/1/shopper');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Shopper profile removed' });
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.query).toHaveBeenCalledTimes(4);
    const clientQueries = (mockClient.query as jest.Mock).mock.calls.map(c => c[0]);
    expect(clientQueries[0]).toBe('BEGIN');
    expect(clientQueries[1]).toMatch(/UPDATE volunteers SET user_id = NULL/);
    expect(clientQueries[2]).toMatch(/DELETE FROM clients/);
    expect(clientQueries[3]).toBe('COMMIT');
  });

  it('unlinks from existing client without deleting record', async () => {
    const mockClient = createMockClient();
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 9 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ profile_link: 'existing-link' }] });

    const res = await request(app).delete('/volunteers/1/shopper');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Shopper profile removed' });
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.query).toHaveBeenCalledTimes(3);
    const queries = (mockClient.query as jest.Mock).mock.calls.map(c => c[0]);
    expect(queries.some((q: string) => /DELETE FROM clients/.test(q))).toBe(false);
    expect(queries[0]).toBe('BEGIN');
    expect(queries[1]).toMatch(/UPDATE volunteers SET user_id = NULL/);
    expect(queries[2]).toBe('COMMIT');
  });
});

describe('Volunteer badges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns computed badges', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] }) // manual badges
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ early: true }] }) // early bird
      .mockResolvedValueOnce({ rows: [{ lifetime_hours: '0', month_hours: '0', total_shifts: '10' }] }) // stats
      .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // heavy lifter
      .mockResolvedValueOnce({ rows: [] }) // weeks
      .mockResolvedValueOnce({ rows: [{ families_served: '4', pounds_handled: '125', month_families_served: '2', month_pounds_handled: '45' }] }); // contributions

    const res = await request(app).get('/volunteers/me/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        badges: ['early-bird', 'heavy-lifter'],
        familiesServed: 4,
        poundsHandled: 125,
        monthFamiliesServed: 2,
        monthPoundsHandled: 45,
      }),
    );
    const queries = (pool.query as jest.Mock).mock.calls.map(c => c[0]);
    expect(queries[1]).toContain("status = 'completed'");
    expect(queries[2]).toContain("status = 'completed'");
    expect(queries[3]).toContain("status = 'completed'");
    expect(queries[4]).toContain("status = 'completed'");
    expect(queries[5]).toContain('weight_without_cart');
    expect(queries[5]).toContain('cart_tare');
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

describe('Update volunteer', () => {
  const staffApp = express();
  staffApp.use(express.json());
  staffApp.use((req, _res, next) => {
    (req as any).user = { role: 'staff' };
    next();
  });
  staffApp.use('/volunteers', volunteersRouter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates volunteer and hashes password', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // emailCheck
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ password: null }] }) // existing
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'A', last_name: 'B', email: 'a@b.c', phone: '123' }],
      });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const res = await request(staffApp).put('/volunteers/1').send({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.ca',
      phone: '123',
      onlineAccess: true,
      password: 'Secret1!',
    });

    expect(res.status).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith('Secret1!', 10);
  });

  it('sends password link when requested', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // emailCheck
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ password: null }] }) // existing
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'A', last_name: 'B', email: 'a@b.c', phone: '123' }],
      });
    (generatePasswordSetupToken as jest.Mock).mockResolvedValue('tok');

    const res = await request(staffApp).put('/volunteers/1').send({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.ca',
      phone: '123',
      onlineAccess: true,
      sendPasswordLink: true,
    });

    expect(res.status).toBe(200);
    expect(generatePasswordSetupToken).toHaveBeenCalledWith('volunteers', 1);
    expect(sendTemplatedEmail).toHaveBeenCalled();
  });

  it('keeps existing password when not provided', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // emailCheck
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ password: 'existing' }] }) // existing
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            first_name: 'A',
            last_name: 'B',
            email: 'a@b.c',
            phone: '555',
            password: 'existing',
            consent: true,
          },
        ],
      });

    const res = await request(staffApp).put('/volunteers/1').send({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.ca',
      phone: '555',
      onlineAccess: true,
    });

    expect(res.status).toBe(200);
    const updateQuery = (pool.query as jest.Mock).mock.calls[2][0];
    expect(updateQuery).toContain('$6::text');
  });
});

describe('Delete volunteer', () => {
  const staffApp = express();
  staffApp.use(express.json());
  staffApp.use((req, _res, next) => {
    (req as any).user = { role: 'staff' };
    next();
  });
  staffApp.use('/volunteers', volunteersRouter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes existing volunteer', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
    const res = await request(staffApp).delete('/volunteers/3');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Volunteer deleted' });
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM volunteers WHERE id = $1', ['3']);
  });

  it('returns 404 when volunteer missing', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
    const res = await request(staffApp).delete('/volunteers/3');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Volunteer not found' });
  });
});
