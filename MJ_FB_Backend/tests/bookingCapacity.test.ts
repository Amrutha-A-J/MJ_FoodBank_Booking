import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import pool from '../src/db';
import jwt from 'jsonwebtoken';

jest.mock('../src/db');
jest.mock('jsonwebtoken');
jest.mock('../src/utils/bookingUtils', () => ({
  isDateWithinCurrentOrNextMonth: jest.fn().mockReturnValue(true),
  countApprovedBookingsForMonth: jest.fn().mockResolvedValue(0),
  updateBookingsThisMonth: jest.fn().mockResolvedValue(0),
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /bookings capacity check', () => {
  it('returns 400 when slot is full', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ id: 1, role: 'shopper', type: 'user' });
    const mockQuery = pool.query as jest.Mock;
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'shopper', phone: '123' }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, max_capacity: 1 }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const today = new Date().toLocaleDateString('en-CA');
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', 'Bearer token')
      .send({ slotId: 1, date: today });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', 'Slot full on selected date');
  });
});
