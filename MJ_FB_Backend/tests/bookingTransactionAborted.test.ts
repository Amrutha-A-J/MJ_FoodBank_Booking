import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import pool from '../src/db';
import jwt from 'jsonwebtoken';
import logger from '../src/utils/logger';
import * as bookingRepository from '../src/models/bookingRepository';
import * as bookingUtils from '../src/utils/bookingUtils';

jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  checkSlotCapacity: jest.fn(),
  insertBooking: jest.fn(),
  lockClientRow: jest.fn(),
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
// Global error handler to capture unhandled errors
const errorHandler = jest.fn(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status || 500).json({ message: err.message });
  },
);
app.use(errorHandler);

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
  (pool.query as jest.Mock).mockResolvedValue({ rows: [{ bookings_this_month: 0 }] });
});

describe('booking controller transaction aborted handling', () => {
  it('returns 503 and suppresses logger on retriable 25P02 errors', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
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
    (bookingRepository.insertBooking as jest.Mock).mockRejectedValue({ code: '25P02' });
    mockClient.query.mockImplementation((sql: string) => {
      if (sql === 'ROLLBACK') {
        return Promise.reject({ code: '25P02' });
      }
      return Promise.resolve({ rows: [] });
    });
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    const today = new Date().toLocaleDateString('en-CA');
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', 'Bearer token')
      .send({ slotId: 1, date: today });

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ message: 'Transaction aborted, please retry' });
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(errorHandler).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
