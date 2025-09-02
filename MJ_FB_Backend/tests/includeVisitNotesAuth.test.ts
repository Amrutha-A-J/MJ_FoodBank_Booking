import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';

jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  fetchBookingHistory: jest.fn().mockResolvedValue([]),
}));
const { fetchBookingHistory } = require('../src/models/bookingRepository');

let currentUser: any = { id: 1, role: 'shopper' };

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = currentUser;
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
  authorizeAccess: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

const app = express();
app.use('/bookings', bookingsRouter);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ message: err.message });
});

describe('includeVisitNotes authorization', () => {
  it('rejects shoppers requesting visit notes', async () => {
    currentUser = { id: 1, role: 'shopper' };
    const res = await request(app).get('/bookings/history?includeVisitNotes=true');
    expect(res.status).toBe(403);
  });

  it('allows staff to request visit notes', async () => {
    currentUser = { id: 2, role: 'staff' };
    const res = await request(app).get('/bookings/history?userId=1&includeVisitNotes=true');
    expect(res.status).not.toBe(403);
    expect(fetchBookingHistory).toHaveBeenCalled();
  });
});

