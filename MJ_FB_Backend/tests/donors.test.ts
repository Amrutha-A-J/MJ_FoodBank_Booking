import request from 'supertest';
import express from 'express';
import donorsRoutes from '../src/routes/donors';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/donors', donorsRoutes);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

const authRow = { id: 1, first_name: 'Test', last_name: 'User', email: 't@example.com', role: 'staff' };

describe('donor routes', () => {
  it.each([
    ['2'],
    ['Alice'],
    ['Smith'],
    ['alice@example.com'],
  ])('lists donors matching %s', async search => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            name: 'Alice Smith',
            email: 'alice@example.com',
            phone: '306-555-1234',
            isPetFood: false,
          },
        ],
      });
    const res = await request(app)
      .get(`/donors?search=${encodeURIComponent(search)}`)
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
      [1],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      `SELECT id, name, email, phone, is_pet_food AS "isPetFood"
       FROM donors
       WHERE CAST(id AS TEXT) ILIKE $1
          OR name ILIKE $1
          OR email ILIKE $1
       ORDER BY name`,
      [`%${search}%`],
    );
    expect(res.body).toEqual([
      {
        id: 2,
        name: 'Alice Smith',
        email: 'alice@example.com',
        phone: '306-555-1234',
        isPetFood: false,
      },
    ]);
  });

  it('deduplicates donors by id when listing', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            name: 'Alice Smith',
            email: 'alice@example.com',
            phone: '306-555-1234',
            isPetFood: false,
          },
          {
            id: 2,
            name: 'Alice Smith',
            email: 'alice@example.com',
            phone: '555-0000',
            isPetFood: false,
          },
        ],
      });
    const res = await request(app)
      .get('/donors')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 2,
        name: 'Alice Smith',
        email: 'alice@example.com',
        phone: '306-555-1234',
        isPetFood: false,
      },
    ]);
  });

  it('adds a donor', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse', 'donation_entry'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 3,
            name: 'Bob Brown',
            email: 'bob@example.com',
            phone: '555-0000',
            isPetFood: true,
          },
        ],
      });
    const res = await request(app)
      .post('/donors')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Bob Brown', email: 'bob@example.com', phone: '555-0000', isPetFood: true });
    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
      [1],
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO donors (name, email, phone, is_pet_food) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, is_pet_food AS "isPetFood"',
      ['Bob Brown', 'bob@example.com', '555-0000', true],
    );
    expect(res.body).toEqual({
      id: 3,
      name: 'Bob Brown',
      email: 'bob@example.com',
      phone: '555-0000',
      isPetFood: true,
    });
  });

  it('adds a donor without email or phone', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse', 'donation_entry'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 4,
            name: 'Cara Jones',
            email: null,
            phone: null,
            isPetFood: false,
          },
        ],
      });
    const res = await request(app)
      .post('/donors')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Cara Jones', email: null, phone: null });
    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO donors (name, email, phone, is_pet_food) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, is_pet_food AS "isPetFood"',
      ['Cara Jones', null, null, false],
    );
    expect(res.body).toEqual({ id: 4, name: 'Cara Jones', email: null, phone: null, isPetFood: false });
  });

  it('returns 409 for duplicate donor email', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce({ code: '23505' });
    const res = await request(app)
      .post('/donors')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Bob Brown', email: 'bob@example.com' });
    expect(res.status).toBe(409);
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, first_name, last_name, email, role FROM staff WHERE id = $1',
      [1],
    );
    expect(res.body).toEqual({ message: 'Donor already exists' });
  });

  it('rejects invalid donor payload', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [authRow] });
    const res = await request(app)
      .post('/donors')
      .set('Authorization', 'Bearer token')
      .send({ name: '', email: 'bad' });
    expect(res.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when db fails on list', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db failure'));
    const res = await request(app)
      .get('/donors')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
  });

  it('returns 500 when db fails on add', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'staff',
      type: 'staff',
      access: ['warehouse', 'donation_entry'],
    });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockRejectedValueOnce(new Error('db failure'));
    const res = await request(app)
      .post('/donors')
      .set('Authorization', 'Bearer token')
      .send({ name: 'X Y', email: 'x@y.com' });
    expect(res.status).toBe(500);
  });
});
  it('updates a donor', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse', 'donation_entry'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ isPetFood: true }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 3,
            name: 'Bob Brown',
            email: 'bob@example.com',
            phone: '555-0000',
            isPetFood: true,
          },
        ],
      });
    const res = await request(app)
      .put('/donors/3')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Bob Brown', email: 'bob@example.com', phone: '555-0000', isPetFood: true });
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      'UPDATE donors SET name = $2, email = $3, phone = $4, is_pet_food = $5 WHERE id = $1 RETURNING id, name, email, phone, is_pet_food AS "isPetFood"',
      ['3', 'Bob Brown', 'bob@example.com', '555-0000', true],
    );
    expect(res.body).toEqual({
      id: 3,
      name: 'Bob Brown',
      email: 'bob@example.com',
      phone: '555-0000',
      isPetFood: true,
    });
  });

  it('returns 404 when donor not found on update', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse', 'donation_entry'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app)
      .put('/donors/99')
      .set('Authorization', 'Bearer token')
      .send({ name: 'X Y', email: null, phone: null, isPetFood: false });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Donor not found' });
  });

  it('returns 409 when update violates unique email', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse', 'donation_entry'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ isPetFood: false }] })
      .mockRejectedValueOnce({ code: '23505' });
    const res = await request(app)
      .put('/donors/3')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Bob Brown', email: 'bob@example.com', phone: null, isPetFood: false });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: 'Donor already exists' });
  });

  it('returns 500 when db fails on update', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff', access: ['warehouse', 'donation_entry'] });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [authRow] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ isPetFood: false }] })
      .mockRejectedValueOnce(new Error('db failure'));
    const res = await request(app)
      .put('/donors/3')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Bob Brown', email: 'bob@example.com', phone: null, isPetFood: false });
    expect(res.status).toBe(500);
  });
