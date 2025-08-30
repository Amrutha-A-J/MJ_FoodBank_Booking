import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import pool from '../src/db';
import * as bookingRepository from '../src/models/bookingRepository';
import * as newClientModel from '../src/models/newClient';

jest.mock('../src/db');
jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  checkSlotCapacity: jest.fn(),
  insertBooking: jest.fn(),
}));
jest.mock('../src/models/newClient', () => ({
  insertNewClient: jest.fn(),
}));
jest.mock('../src/utils/bookingUtils', () => ({
  isDateWithinCurrentOrNextMonth: jest.fn().mockReturnValue(true),
}));

const app = express();
app.use(express.json());
app.use('/bookings', bookingsRouter);
// global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ message: err.message });
});

beforeEach(() => {
  jest.clearAllMocks();
  (pool.connect as jest.Mock).mockResolvedValue({ query: jest.fn(), release: jest.fn() });
  (bookingRepository.checkSlotCapacity as jest.Mock).mockResolvedValue(undefined);
  (bookingRepository.insertBooking as jest.Mock).mockResolvedValue(undefined);
  (newClientModel.insertNewClient as jest.Mock).mockResolvedValue(1);
});

describe('POST /bookings/new-client', () => {
  it('creates booking and new client', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .post('/bookings/new-client')
      .send({ name: 'New Client', email: 'n@example.com', phone: '123', slotId: 1, date: today });
    expect(res.status).toBe(201);
    expect(newClientModel.insertNewClient).toHaveBeenCalledWith(
      'New Client',
      'n@example.com',
      '123',
      expect.any(Object),
    );
    expect(bookingRepository.insertBooking).toHaveBeenCalledWith(
      null,
      1,
      'approved',
      '',
      today,
      false,
      expect.any(String),
      1,
      expect.any(Object),
    );
  });
});
