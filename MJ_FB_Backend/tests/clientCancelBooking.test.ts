import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import * as bookingRepository from '../src/models/bookingRepository';
import pool from '../src/db';
import { formatReginaDate } from '../src/utils/dateUtils';

jest.mock('../src/db');
jest.mock('../src/utils/emailQueue', () => ({ enqueueEmail: jest.fn() }));
jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  fetchBookingById: jest.fn(),
  updateBooking: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: '10', role: 'client', email: 'client@example.com' };
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
    req.user = { id: '10', role: 'client' };
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
  jest.clearAllMocks();
  (pool.query as jest.Mock).mockResolvedValue({ rows: [{ email: 'client@example.com' }] });
});

describe('client cancelling own booking', () => {
  it('allows client to cancel their booking', async () => {
    const futureDate = formatReginaDate(new Date(Date.now() + 86400000));
    (bookingRepository.fetchBookingById as jest.Mock).mockResolvedValue({
      id: 1,
      user_id: '10',
      status: 'approved',
      date: futureDate,
    });
    (bookingRepository.updateBooking as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).post('/bookings/1/cancel');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Booking cancelled');
  });
});

