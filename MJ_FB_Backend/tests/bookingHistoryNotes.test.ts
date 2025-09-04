import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';
import * as bookingRepository from '../src/models/bookingRepository';

jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  fetchBookingHistory: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: 1, role: 'shopper', userId: 1 };
    next();
  },
  authorizeAccess: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
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
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ message: err.message });
});

describe('booking history notes', () => {
  it('includes client notes but omits staff notes by default', async () => {
    (bookingRepository.fetchBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        date: '2024-01-01',
        slot_id: 1,
        reason: null,
        start_time: '09:00:00',
        end_time: '09:30:00',
        created_at: '2024-01-01',
        is_staff_booking: false,
        reschedule_token: 'tok',
        client_note: 'bring ID',
      },
      {
        id: 2,
        status: 'visited',
        date: '2024-01-02',
        slot_id: null,
        reason: null,
        start_time: null,
        end_time: null,
        created_at: '2024-01-02',
        is_staff_booking: false,
        reschedule_token: null,
        client_note: null,
        staff_note: 'visit note',
      },
    ]);

    const res = await request(app).get('/bookings/history');
    expect(res.status).toBe(200);
    expect(res.body[0].client_note).toBe('bring ID');
    expect(res.body[0].staff_note).toBeUndefined();
    expect(res.body[1].client_note).toBeNull();
    expect(res.body[1].staff_note).toBeUndefined();
  });
});
