import request from 'supertest';
import express from 'express';
import blockedSlotsRouter from '../src/routes/blockedSlots';
import slotsRouter from '../src/routes/slots';
import { authMiddleware, authorizeRoles } from '../src/middleware/authMiddleware';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('../src/db');
jest.mock('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/blocked-slots', blockedSlotsRouter);
app.use('/slots', slotsRouter);
app.get('/volunteer-area', authMiddleware, authorizeRoles('volunteer'), (_req, res) => res.json({ ok: true }));

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Authorization middleware', () => {
  it('returns 403 when shopper accesses blocked slots', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'shopper', phone: '123' }],
    });

    const res = await request(app)
      .post('/blocked-slots')
      .set('Authorization', 'Bearer token')
      .send({ date: '2024-01-01', slotId: 1 });
    expect(res.status).toBe(403);
  });

  it('returns 403 when shopper accesses all slots', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'shopper', phone: '123' }],
    });

    const res = await request(app)
      .get('/slots/all')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(403);
  });

  it('allows coordinator to access volunteer endpoint', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 2, role: 'volunteer_coordinator', type: 'staff' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 2, first_name: 'Coord', last_name: 'inator', email: 'coord@example.com', role: 'volunteer_coordinator' }],
    });

    const res = await request(app)
      .get('/volunteer-area')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
  });

  it('allows volunteer to access volunteer endpoint', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 3, role: 'volunteer', type: 'volunteer' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 3, first_name: 'Vol', last_name: 'unteer', email: 'vol@example.com' }],
    });

    const res = await request(app)
      .get('/volunteer-area')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
  });

  it('returns 403 when shopper accesses volunteer endpoint', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'shopper', phone: '123' }],
    });

    const res = await request(app)
      .get('/volunteer-area')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(403);
  });
});
