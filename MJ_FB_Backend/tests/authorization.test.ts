import request from 'supertest';
import express from 'express';
import blockedSlotsRouter from '../src/routes/blockedSlots';
import slotsRouter from '../src/routes/slots';
import { authMiddleware, authorizeRoles, authorizeAccess } from '../src/middleware/authMiddleware';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');
jest.mock('../src/controllers/slotController', () => ({
  __esModule: true,
  listAllSlots: (_req: express.Request, res: express.Response) => res.json([]),
  listSlots: (_req: express.Request, res: express.Response) => res.json([]),
  listSlotsRange: (_req: express.Request, res: express.Response) => res.json([]),
  createSlot: jest.fn(),
  updateSlot: jest.fn(),
  updateAllSlotCapacity: jest.fn(),
  deleteSlot: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/blocked-slots', blockedSlotsRouter);
app.use('/slots', slotsRouter);
app.get('/volunteer-area', authMiddleware, authorizeRoles('volunteer'), (_req, res) => res.json({ ok: true }));
app.get('/staff-area', authMiddleware, authorizeRoles('staff'), (_req, res) => res.json({ ok: true }));
app.get(
  '/warehouse-area',
  authMiddleware,
  authorizeRoles('staff'),
  authorizeAccess('warehouse'),
  (_req, res) => res.json({ ok: true }),
);

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Authorization middleware', () => {
  it('returns 403 when shopper accesses blocked slots', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ client_id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'shopper', phone: '123' }],
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
      rows: [{ client_id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'shopper', phone: '123' }],
    });

    const res = await request(app)
      .get('/slots/all')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(403);
  });

  it('allows volunteer to access slots', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 3, role: 'volunteer', type: 'volunteer' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 3, first_name: 'Vol', last_name: 'unteer', email: 'vol@example.com' }],
    });

    const res = await request(app)
      .get('/slots')
      .set('Authorization', 'Bearer token')
      .query({ date: '2024-06-18' });
    expect(res.status).toBe(200);
  });

  it('allows staff to access staff endpoint', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 2, role: 'staff', type: 'staff' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 2, first_name: 'Staff', last_name: 'Member', email: 'staff@example.com', role: 'staff' }],
    });

    const res = await request(app)
      .get('/staff-area')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
  });

  it('allows staff to access volunteer endpoint due to hierarchy', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 2, role: 'staff', type: 'staff' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 2, first_name: 'Staff', last_name: 'Member', email: 'staff@example.com', role: 'staff' }],
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

  it('prevents volunteer from accessing staff endpoint', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 3, role: 'volunteer', type: 'volunteer' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 3, first_name: 'Vol', last_name: 'unteer', email: 'vol@example.com' }],
    });

    const res = await request(app)
      .get('/staff-area')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(403);
  });

  it('allows admin to access staff endpoint', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 4, role: 'admin', type: 'staff' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 4, first_name: 'Admin', last_name: 'User', email: 'admin@example.com', role: 'admin' }],
    });

    const res = await request(app)
      .get('/staff-area')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
  });

  it('allows admin to access volunteer endpoint', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 4, role: 'admin', type: 'staff' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 4, first_name: 'Admin', last_name: 'User', email: 'admin@example.com', role: 'admin' }],
    });

    const res = await request(app)
      .get('/volunteer-area')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
  });

  it('allows admin to bypass access checks', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 4, role: 'admin', type: 'staff' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 4, first_name: 'Admin', last_name: 'User', email: 'admin@example.com', role: 'admin' }],
    });

    const res = await request(app)
      .get('/warehouse-area')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
  });

  it('returns 403 when shopper accesses volunteer endpoint', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
    (pool.query as jest.Mock).mockResolvedValue({
      rowCount: 1,
      rows: [{ client_id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'shopper', phone: '123' }],
    });

    const res = await request(app)
      .get('/volunteer-area')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(403);
  });
});
