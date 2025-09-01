import '../tests/utils/mockDb';
import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';
import { sendTemplatedEmail } from '../src/utils/emailUtils';

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
}));
const sendTemplatedEmailMock = sendTemplatedEmail as jest.Mock;
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

describe('rescheduleVolunteerBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps status approved when volunteer reschedules an approved booking', async () => {
    const booking = { id: 1, volunteer_id: 2, status: 'approved' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [booking] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role_id: 1, max_volunteers: 5, start_time: '09:00', end_time: '12:00' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ count: 0 }] })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post('/volunteer-bookings/reschedule/token123')
      .send({ roleId: 4, date: '2025-09-01' });

    expect(res.status).toBe(200);
    const updateCall = (pool.query as jest.Mock).mock.calls[6];
    expect(updateCall[0]).toContain("status='approved'");
    expect(sendTemplatedEmailMock.mock.calls).toHaveLength(2);
    expect(sendTemplatedEmailMock.mock.calls[0][0]).toMatchObject({
      to: 'coordinator1@example.com',
      templateId: 0,
    });
    expect(sendTemplatedEmailMock.mock.calls[1][0]).toMatchObject({
      to: 'coordinator2@example.com',
      templateId: 0,
    });
  });
});
