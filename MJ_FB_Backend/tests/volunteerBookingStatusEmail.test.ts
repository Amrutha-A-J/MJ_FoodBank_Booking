import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';
import { sendEmail } from '../src/utils/emailUtils';

jest.mock('../src/db');
jest.mock('../src/utils/emailUtils', () => ({ sendEmail: jest.fn() }));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (req.headers['x-staff']) {
      (req as any).user = { role: 'staff' };
    }
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/volunteer-bookings', volunteerBookingsRouter);

describe('updateVolunteerBookingStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends coordinator emails when booking is cancelled', async () => {
    const booking = { id: 1, slot_id: 2, volunteer_id: 3, date: '2025-09-01', status: 'approved' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          { id: 1, slot_id: 2, volunteer_id: 3, date: '2025-09-01', status: 'cancelled', recurring_id: null },
        ],
      });

    const res = await request(app)
      .patch('/volunteer-bookings/1')
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect((sendEmail as jest.Mock).mock.calls).toHaveLength(2);
    expect((sendEmail as jest.Mock).mock.calls[0][0]).toBe('coordinator1@example.com');
    expect((sendEmail as jest.Mock).mock.calls[1][0]).toBe('coordinator2@example.com');
  });
});

