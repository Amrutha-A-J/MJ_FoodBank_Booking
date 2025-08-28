import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import * as bookingUtils from '../src/utils/bookingUtils';
import { LIMIT_MESSAGE } from '../src/utils/bookingUtils';

// --- Fake in-memory DB with minimal locking ---
var fakePool = (() => {
  const bookings: any[] = [];
  let locked = false;
  const queue: Array<() => void> = [];
  function release() {
    locked = false;
    const next = queue.shift();
    if (next) next();
  }

  class Client {
    async query(sql: string, params: any[] = []) {
      if (sql === 'BEGIN') return {};
      if (sql === 'COMMIT' || sql === 'ROLLBACK') {
        release();
        return {};
      }
      if (sql.startsWith('SELECT max_capacity FROM slots')) {
        return { rowCount: 1, rows: [{ max_capacity: 5 }] };
      }
      if (
        sql.startsWith(
          "SELECT COUNT(*) FROM bookings WHERE slot_id=$1 AND date=$2 AND status='approved'",
        )
      ) {
        const [slotId, date] = params;
        const count = bookings.filter(
          (b) => b.slotId === slotId && b.date === date && b.status === 'approved',
        ).length;
        return { rows: [{ count: String(count) }] };
      }
      if (
        sql.startsWith(
          "SELECT COUNT(*) FROM bookings WHERE user_id=$1 AND status='approved' AND date BETWEEN $2 AND $3 FOR UPDATE",
        )
      ) {
        if (locked) {
          await new Promise<void>((res) => queue.push(res));
        }
        locked = true;
        const [userId, start, end] = params;
        const count = bookings.filter(
          (b) =>
            b.userId === userId &&
            b.status === 'approved' &&
            b.date >= start &&
            b.date <= end,
        ).length;
        return { rows: [{ count: String(count) }] };
      }
      if (sql.startsWith('INSERT INTO bookings')) {
        const [userId, slotId, status, _req, date] = params;
        await new Promise((resolve) => setTimeout(resolve, 10));
        bookings.push({ userId, slotId, status, date });
        return { rowCount: 1 };
      }
      if (sql.startsWith('SELECT bookings_this_month FROM clients')) {
        return { rows: [{ bookings_this_month: 0 }] };
      }
      throw new Error('Unhandled query: ' + sql);
    }
    release() {}
  }

  return {
    bookings,
    async connect() {
      return new Client();
    },
    async query(sql: string, params?: any[]) {
      const client = new Client();
      return client.query(sql, params);
    },
    reset() {
      bookings.length = 0;
      locked = false;
      queue.length = 0;
    },
  };
})();

jest.mock('../src/db', () => ({ __esModule: true, get default() { return fakePool; } }));
jest.mock('../src/utils/emailQueue', () => ({ enqueueEmail: jest.fn() }));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 1, role: 'shopper', email: 'user@example.com' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: 1, role: 'shopper', email: 'user@example.com' };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/bookings', bookingsRouter);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ message: err.message });
});

beforeEach(() => {
  fakePool.reset();
  jest.spyOn(bookingUtils, 'isDateWithinCurrentOrNextMonth').mockReturnValue(true);
  jest.spyOn(bookingUtils, 'findUpcomingBooking').mockResolvedValue(null);
});

describe('booking limits', () => {
  it('rejects third booking in current month', async () => {
    const today = new Date().toISOString().split('T')[0];
    fakePool.bookings.push(
      { userId: 1, slotId: 1, status: 'approved', date: today },
      { userId: 1, slotId: 2, status: 'approved', date: today },
    );

    const res = await request(app).post('/bookings').send({ slotId: 1, date: today });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', LIMIT_MESSAGE);
  });

  it('allows booking for next month after two visits this month', async () => {
    const today = new Date();
    const current = today.toISOString().split('T')[0];
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5)
      .toISOString()
      .split('T')[0];
    fakePool.bookings.push(
      { userId: 1, slotId: 1, status: 'approved', date: current },
      { userId: 1, slotId: 2, status: 'approved', date: current },
    );

    const res = await request(app).post('/bookings').send({ slotId: 1, date: nextMonth });
    expect(res.status).toBe(201);
  });

  it('prevents simultaneous bookings exceeding limit', async () => {
    const today = new Date().toISOString().split('T')[0];
    fakePool.bookings.push({ userId: 1, slotId: 1, status: 'approved', date: today });

    const first = await request(app)
      .post('/bookings')
      .send({ slotId: 1, date: today, isStaffBooking: true });
    const second = await request(app)
      .post('/bookings')
      .send({ slotId: 1, date: today, isStaffBooking: true });

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 400]);
    expect(
      fakePool.bookings.filter((b) => b.userId === 1 && b.status === 'approved').length,
    ).toBe(2);
  });
});
