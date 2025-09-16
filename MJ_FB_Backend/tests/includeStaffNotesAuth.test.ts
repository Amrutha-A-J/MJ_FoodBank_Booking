import request from 'supertest';
import express from 'express';
import bookingsRouter from '../src/routes/bookings';

jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  ...jest.requireActual('../src/models/bookingRepository'),
  fetchBookingHistory: jest.fn(),
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

describe('includeStaffNotes handling', () => {
  beforeEach(() => {
    (fetchBookingHistory as jest.Mock).mockReset();
  });

  it('returns staff notes for staff by default', async () => {
    currentUser = { id: 2, role: 'staff' };
    (fetchBookingHistory as jest.Mock).mockResolvedValue([
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
    const res = await request(app).get('/bookings/history?userId=1');
    expect(res.status).toBe(200);
    expect(res.body[0].client_note).toBe('bring ID');
    expect(res.body[1].staff_note).toBe('visit note');
  });

  it('omits staff notes for shoppers even when requested', async () => {
    currentUser = { id: 1, role: 'shopper' };
    (fetchBookingHistory as jest.Mock).mockResolvedValue([
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
    const res = await request(app).get('/bookings/history?includeStaffNotes=true');
    expect(res.status).toBe(200);
    expect(res.body[0].client_note).toBe('bring ID');
    expect(res.body[1].staff_note).toBeUndefined();
  });

  it('shows staff notes only to staff while shoppers see client notes', async () => {
    (fetchBookingHistory as jest.Mock).mockResolvedValue([
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
        client_note: 'client note',
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
        staff_note: 'staff note',
      },
    ]);
    currentUser = { id: 2, role: 'staff' };
    const staffRes = await request(app).get('/bookings/history?userId=1');
    expect(staffRes.status).toBe(200);
    expect(staffRes.body[0].client_note).toBe('client note');
    expect(staffRes.body[1].staff_note).toBe('staff note');

    currentUser = { id: 1, role: 'shopper' };
    const shopperRes = await request(app).get('/bookings/history');
    expect(shopperRes.status).toBe(200);
    expect(shopperRes.body[0].client_note).toBe('client note');
    expect(shopperRes.body[1].staff_note).toBeUndefined();
  });
});
