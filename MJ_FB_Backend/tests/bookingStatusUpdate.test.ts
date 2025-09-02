import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import * as bookingRepo from '../src/models/bookingRepository';
import pool from '../src/db';

jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  updateBooking: jest.fn(),
}));


jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    const role = req.headers['x-role'] as string || 'staff';
    req.user = { id: 1, role };
    next();
  },
  authorizeRoles: (...roles: string[]) => (req: any, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  },
  optionalAuthMiddleware: (_req: any, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: any, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/bookings', bookingsRouter);

describe('booking status updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows staff to mark booking as no-show', async () => {
    (bookingRepo.updateBooking as jest.Mock).mockResolvedValue(undefined);
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [{ email: 'client@example.com', reschedule_token: 'tok', date: '2024-01-01' }],
    });
    const res = await request(app)
      .post('/bookings/1/no-show')
      .set('x-role', 'staff')
      .send({ reason: 'missed' });
    expect(res.status).toBe(200);
    expect(bookingRepo.updateBooking).toHaveBeenCalledWith(1, {
      status: 'no_show',
      request_data: 'missed',
    });
  });

  it('allows staff to mark booking as visited', async () => {
    (bookingRepo.updateBooking as jest.Mock).mockResolvedValue(undefined);
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ client_id: 1 }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(app)
      .post('/bookings/2/visited')
      .set('x-role', 'staff')
      .send({ requestData: 'note', note: 'remember ID' });
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      [null, null, 0, 'remember ID', 2],
    );
    expect(bookingRepo.updateBooking).toHaveBeenCalledWith(2, {
      status: 'visited',
      request_data: 'note',
    });
  });

  it('rejects non-staff users', async () => {
    const res = await request(app)
      .post('/bookings/3/visited')
      .set('x-role', 'shopper');
    expect(res.status).toBe(403);
    expect(bookingRepo.updateBooking).not.toHaveBeenCalled();
  });
});
