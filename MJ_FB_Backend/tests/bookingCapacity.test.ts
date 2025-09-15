import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import pool from '../src/db';
import jwt from 'jsonwebtoken';
import * as bookingRepository from '../src/models/bookingRepository';
import * as bookingUtils from '../src/utils/bookingUtils';

jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  checkSlotCapacity: jest.fn(),
  insertBooking: jest.fn(),
}));
jest.mock('jsonwebtoken');
jest.mock('../src/utils/bookingUtils', () => ({
  isDateWithinCurrentOrNextMonth: jest.fn().mockReturnValue(true),
  countVisitsAndBookingsForMonth: jest.fn().mockResolvedValue(0),
  findUpcomingBooking: jest.fn().mockResolvedValue(null),
  LIMIT_MESSAGE: 'limit',
}));

const app = express();
app.use(express.json());
app.use('/bookings', bookingsRouter);
// Global error handler to capture thrown errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ message: err.message });
});

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

let mockClient: { query: jest.Mock; release: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
  (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  (pool.query as jest.Mock).mockResolvedValue({ rows: [{ bookings_this_month: 0 }], rowCount: 0 });
  (bookingUtils.countVisitsAndBookingsForMonth as jest.Mock).mockResolvedValue(0);
  (bookingUtils.findUpcomingBooking as jest.Mock).mockResolvedValue(null);
  (bookingUtils.isDateWithinCurrentOrNextMonth as jest.Mock).mockReturnValue(true);
});

describe('POST /bookings capacity check', () => {
  it('returns 403 when delivery user posts to bookings', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'delivery', type: 'user' });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          client_id: 1,
          first_name: 'Delivery',
          last_name: 'User',
          email: 'delivery@example.com',
          role: 'delivery',
          phone: '123',
        },
      ],
    });

    const today = new Date().toLocaleDateString('en-CA');
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', 'Bearer token')
      .send({ slotId: 1, date: today });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Forbidden' });
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('returns 409 when slot is full', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ client_id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'shopper', phone: '123' }],
    });
    (bookingRepository.checkSlotCapacity as jest.Mock).mockRejectedValue(
      new bookingRepository.SlotCapacityError('Slot full on selected date', 409),
    );

    const today = new Date().toLocaleDateString('en-CA');
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', 'Bearer token')
      .send({ slotId: 1, date: today });
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('message', 'Slot full on selected date');
    expect(bookingRepository.insertBooking).not.toHaveBeenCalled();
  });

  it('returns a controlled error when visit count query fails', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 1,
      role: 'shopper',
      type: 'user',
    });
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          client_id: 1,
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          role: 'shopper',
          phone: '123',
        },
      ],
    });
    (bookingUtils.countVisitsAndBookingsForMonth as jest.Mock).mockRejectedValueOnce(
      new Error('db fail'),
    );

    const today = new Date().toLocaleDateString('en-CA');
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', 'Bearer token')
      .send({ slotId: 1, date: today });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'db fail');
    expect(res.body.message).not.toContain('current transaction is aborted');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(bookingRepository.checkSlotCapacity).not.toHaveBeenCalled();
  });
});

describe('checkSlotCapacity', () => {
  it('throws SlotCapacityError when transaction is aborted', async () => {
    const { checkSlotCapacity: actualCheckSlotCapacity } = jest.requireActual('../src/models/bookingRepository');
    const mockClient = { query: jest.fn().mockRejectedValue({ code: '25P02' }) };
    await expect(
      actualCheckSlotCapacity(1, '2024-01-01', mockClient as any),
    ).rejects.toMatchObject({
      message: 'Transaction aborted, please retry',
      status: 503,
    });
  });
});
