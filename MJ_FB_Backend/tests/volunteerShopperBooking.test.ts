import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import * as bookingUtils from '../src/utils/bookingUtils';
import * as bookingRepository from '../src/models/bookingRepository';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('../src/utils/emailUtils', () => ({ sendEmail: jest.fn() }));
jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  checkSlotCapacity: jest.fn(),
  insertBooking: jest.fn(),
  fetchBookingById: jest.fn(),
  fetchBookingByToken: jest.fn(),
  updateBooking: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = {
      id: 'v1',
      role: 'volunteer',
      userId: '10',
      userRole: 'shopper',
      email: 'vol@example.com',
    };
    next();
  },
  authorizeRoles: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  authorizeAccess: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  optionalAuthMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = {
      id: 'v1',
      role: 'volunteer',
      userId: '10',
      userRole: 'shopper',
      email: 'vol@example.com',
    };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/bookings', bookingsRouter);
// global error handler
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(err.status || 500).json({ message: err.message });
  },
);

beforeEach(() => {
  jest.clearAllMocks();
  (pool.connect as jest.Mock).mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  });
  (pool.query as jest.Mock).mockResolvedValue({ rows: [{ bookings_this_month: 0 }] });
  jest.spyOn(bookingUtils, 'isDateWithinCurrentOrNextMonth').mockReturnValue(true);
  jest.spyOn(bookingUtils, 'countApprovedBookingsForMonth').mockResolvedValue(0);
  jest.spyOn(bookingUtils, 'findUpcomingBooking').mockResolvedValue(null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('volunteer acting as shopper', () => {
  it('can create a booking', async () => {
    (bookingRepository.checkSlotCapacity as jest.Mock).mockResolvedValue(undefined);
    (bookingRepository.insertBooking as jest.Mock).mockResolvedValue(undefined);

    const today = new Date().toISOString().split('T')[0];

    const res = await request(app)
      .post('/bookings')
      .send({ slotId: 1, date: today });

    expect(res.status).toBe(201);
    expect(bookingUtils.countApprovedBookingsForMonth).toHaveBeenCalledWith(10, today);
    expect((bookingRepository.insertBooking as jest.Mock).mock.calls[0][0]).toBe(10);
  });

  it('can cancel their booking', async () => {
    const futureDate = new Date(Date.now() + 86400000)
      .toISOString()
      .split('T')[0];
    (bookingRepository.fetchBookingById as jest.Mock).mockResolvedValue({
      id: 1,
      user_id: 10,
      status: 'submitted',
      date: futureDate,
    });
    (bookingRepository.updateBooking as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).post('/bookings/1/cancel');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Booking cancelled');
  });

  it('can reschedule their booking', async () => {
    const futureDate = new Date(Date.now() + 86400000)
      .toISOString()
      .split('T')[0];
    (bookingRepository.fetchBookingByToken as jest.Mock).mockResolvedValue({
      id: 1,
      user_id: 10,
      status: 'approved',
      slot_id: 1,
    });
    (bookingRepository.checkSlotCapacity as jest.Mock).mockResolvedValue(undefined);
    (bookingRepository.updateBooking as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .post('/bookings/reschedule/token123')
      .send({ slotId: 2, date: futureDate });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Booking rescheduled');
  });
});

afterAll(() => {
  jest.resetModules();
});

