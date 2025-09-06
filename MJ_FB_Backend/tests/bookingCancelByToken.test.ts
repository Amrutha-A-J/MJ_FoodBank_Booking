import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import * as bookingRepository from '../src/models/bookingRepository';
import { formatReginaDate } from '../src/utils/dateUtils';

jest.mock('../src/utils/emailQueue', () => ({ enqueueEmail: jest.fn() }));
jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  fetchBookingByToken: jest.fn(),
  updateBooking: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  optionalAuthMiddleware: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  authMiddleware: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
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
}));

const app = express();
app.use(express.json());
app.use('/bookings', bookingsRouter);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ message: err.message });
});

describe('cancel booking by token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels booking with token', async () => {
    const futureDate = formatReginaDate(new Date(Date.now() + 86400000));
    (bookingRepository.fetchBookingByToken as jest.Mock).mockResolvedValue({
      id: 1,
      status: 'approved',
      date: futureDate,
    });
    (bookingRepository.updateBooking as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).post('/bookings/cancel/tok123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Booking cancelled' });
    expect(bookingRepository.updateBooking).toHaveBeenCalledWith(1, {
      status: 'cancelled',
      request_data: 'user cancelled',
    });
  });
});

