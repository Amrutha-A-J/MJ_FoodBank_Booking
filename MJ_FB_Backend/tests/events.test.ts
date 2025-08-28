import request from 'supertest';
import express from 'express';
import eventsRouter from '../src/routes/events';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('../src/db');
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
      // Only the auth query should have been executed
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
