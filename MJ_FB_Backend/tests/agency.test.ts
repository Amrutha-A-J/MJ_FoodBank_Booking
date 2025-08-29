import request from 'supertest';
import express from 'express';
import usersRouter from '../src/routes/users';
import bookingsRouter from '../src/routes/bookings';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as bookingRepository from '../src/models/bookingRepository';
import { getAgencyByEmail, isAgencyClient } from '../src/models/agency';
import * as bookingUtils from '../src/utils/bookingUtils';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../src/utils/emailUtils', () => ({ sendEmail: jest.fn() }));
jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  checkSlotCapacity: jest.fn(),
  insertBooking: jest.fn(),
  fetchBookingHistory: jest.fn().mockResolvedValue([]),
}));
jest.mock('../src/models/agency', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/agency'),
  getAgencyByEmail: jest.fn(),
  isAgencyClient: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: '1', role: 'agency', email: 'a@b.com' };
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
    req.user = { id: '1', role: 'agency', email: 'a@b.com' };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);
app.use('/api/bookings', bookingsRouter);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ message: err.message });
});

beforeAll(() => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
});

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .spyOn(bookingUtils, 'isDateWithinCurrentOrNextMonth')
    .mockReturnValue(true);
  jest
    .spyOn(bookingUtils, 'countVisitsAndBookingsForMonth')
    .mockResolvedValue(0);
  jest.spyOn(bookingUtils, 'findUpcomingBooking').mockResolvedValue(null);
  (pool.connect as jest.Mock).mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  });
  (pool.query as jest.Mock).mockResolvedValue({ rows: [{ bookings_this_month: 0 }] });
});

describe('Agency login and token issuance', () => {
  it('logs in agency and sets token cookie', async () => {
    (getAgencyByEmail as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Agency One',
      email: 'a@b.com',
      password: 'hashed',
      contact_info: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('token');

    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'a@b.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('role', 'agency');
    expect(jwt.sign).toHaveBeenCalled();
    expect(res.headers['set-cookie'][0]).toMatch(/token=/);
  });
});

describe('Agency booking creation', () => {
  const today = new Date().toISOString().split('T')[0];

  it('creates booking for associated client', async () => {
    (isAgencyClient as jest.Mock).mockResolvedValue(true);
    (bookingRepository.checkSlotCapacity as jest.Mock).mockResolvedValue(undefined);
    (bookingRepository.insertBooking as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/bookings')
      .send({ userId: 5, slotId: 1, date: today });

    expect(res.status).toBe(201);
    expect(bookingRepository.insertBooking).toHaveBeenCalled();
  });

  it('rejects booking for unassociated client', async () => {
    (isAgencyClient as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/bookings')
      .send({ userId: 5, slotId: 1, date: today });

    expect(res.status).toBe(403);
  });
});

  describe('Booking history access control', () => {
    it('ignores userId query for agency', async () => {
      (isAgencyClient as jest.Mock).mockResolvedValue(true);
      const res = await request(app)
        .get('/api/bookings/history')
        .query({ userId: 99 });

      expect(res.status).toBe(200);
      expect(
        (bookingRepository.fetchBookingHistory as jest.Mock).mock.calls[0][0],
      ).toEqual([99]);
    });

    it('passes pagination and clientIds for agencies', async () => {
      (isAgencyClient as jest.Mock).mockResolvedValue(true);
      const res = await request(app)
        .get('/api/bookings/history')
        .query({ clientIds: '5,6', limit: '10', offset: '5' });

      expect(res.status).toBe(200);
      expect(
        (bookingRepository.fetchBookingHistory as jest.Mock).mock.calls[0][0],
      ).toEqual([5, 6]);
      const args = (bookingRepository.fetchBookingHistory as jest.Mock).mock
        .calls[0];
      expect(args[4]).toBe(10);
      expect(args[5]).toBe(5);
    });
  });

