import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/utils/bookingUtils', () => ({
  isDateWithinCurrentOrNextMonth: jest.fn(),
  countVisitsAndBookingsForMonth: jest.fn(),
  LIMIT_MESSAGE: 'limit',
  findUpcomingBooking: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 1, role: 'shopper', email: 'test@example.com' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: 1, role: 'shopper', email: 'test@example.com' };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/bookings', bookingsRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /bookings slotId validation', () => {
  it('returns 400 for missing slotId without querying the DB', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app).post('/bookings').send({ date: today });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Please select a time slot');
    expect(pool.query).not.toHaveBeenCalled();
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid slotId without querying the DB', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app).post('/bookings').send({ slotId: 'abc', date: today });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Please select a valid time slot');
    expect(pool.query).not.toHaveBeenCalled();
    expect(pool.connect).not.toHaveBeenCalled();
  });
});
