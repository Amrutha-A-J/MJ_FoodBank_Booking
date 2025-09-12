import request from 'supertest';
import express from 'express';
import eventsRouter from '../src/routes/events';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/events', eventsRouter);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /events', () => {
  it('orders events by priority and start date', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff' });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'T', last_name: 'S', email: 't@e.com', role: 'staff' }],
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app)
      .get('/events')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[1][0]).toContain('ORDER BY e.priority DESC, e.start_date ASC');
  });
});

describe('DELETE /events/:id', () => {
  it('returns 400 for invalid id', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff' });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, first_name: 'T', last_name: 'S', email: 't@e.com', role: 'staff' }],
    });
    const res = await request(app)
      .delete('/events/abc')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('deletes an existing event', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff' });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'T', last_name: 'S', email: 't@e.com', role: 'staff' }],
      })
      .mockResolvedValueOnce({ rowCount: 1 });
    const res = await request(app)
      .delete('/events/1')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Deleted' });
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM events WHERE id = $1', [1]);
  });
});

describe('POST /events', () => {
  const validBody = {
    title: 'Test',
    details: 'Details',
    category: 'General',
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  };

  it('creates an event and commits the transaction', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff' });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, first_name: 'T', last_name: 'S', email: 't@e.com', role: 'staff' }],
    });
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 42 }] }) // insert event
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(client);
    const res = await request(app)
      .post('/events')
      .set('Authorization', 'Bearer token')
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 42 });
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO events (title, details, category, start_date, end_date, created_by, visible_to_volunteers, visible_to_clients, priority) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      ['Test', 'Details', 'General', '2024-01-01', '2024-01-02', 1, false, false, 0]
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('rolls back if inserting event fails', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff' });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, first_name: 'T', last_name: 'S', email: 't@e.com', role: 'staff' }],
    });
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('fail')) // insert event fails
        .mockResolvedValueOnce(undefined), // ROLLBACK
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(client);
    const res = await request(app)
      .post('/events')
      .set('Authorization', 'Bearer token')
      .send(validBody);
    expect(res.status).toBe(500);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('PUT /events/:id', () => {
  it('updates event priority', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'staff', type: 'staff' });
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'T', last_name: 'S', email: 't@e.com', role: 'staff' }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, priority: 5 }],
      });
    const res = await request(app)
      .put('/events/1')
      .set('Authorization', 'Bearer token')
      .send({ priority: 5 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, priority: 5 });
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE events SET priority = $1 WHERE id = $2 RETURNING id, priority',
      [5, 1]
    );
  });
});
