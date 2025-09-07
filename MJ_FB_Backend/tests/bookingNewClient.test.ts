import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import pool from '../src/db';
import * as bookingRepository from '../src/models/bookingRepository';
import * as newClientModel from '../src/models/newClient';
import { formatReginaDate } from '../src/utils/dateUtils';

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
jest.mock('../src/db', () => ({ __esModule: true, default: { connect: jest.fn(), query: jest.fn() } }));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: 'staff1', role: 'staff' };
    next();
  },
  authorizeRoles: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  optionalAuthMiddleware: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
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
  (pool.query as jest.Mock).mockResolvedValue({ rows: [{ start_time: '09:00:00' }] });
  (bookingRepository.checkSlotCapacity as jest.Mock).mockResolvedValue(undefined);
  (bookingRepository.insertBooking as jest.Mock).mockResolvedValue(undefined);
  (newClientModel.insertNewClient as jest.Mock).mockResolvedValue(1);
});

describe('POST /bookings/new-client', () => {
  it('creates booking and new client', async () => {
    const today = formatReginaDate(new Date());
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

  it('creates booking without email', async () => {
    const today = formatReginaDate(new Date());
    const res = await request(app)
      .post('/bookings/new-client')
      .send({ name: 'No Email', phone: '123', slotId: 1, date: today });
    expect(res.status).toBe(201);
    expect(newClientModel.insertNewClient).toHaveBeenCalledWith(
      'No Email',
      null,
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
