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
  authMiddleware: (req: any, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 1, role: 'staff', email: 'staff@example.com' };
    next();
  },
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/volunteer-bookings', volunteerBookingsRouter);

describe('staff recurring volunteer bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates recurring bookings for a volunteer', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ role_id: 2, max_volunteers: 3, category_name: 'Pantry' }],
      })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ email: 'vol@example.com' }] })
      .mockResolvedValueOnce({ rows: [{ id: 30 }] })
      .mockResolvedValue({ rowCount: 0, rows: [{ count: '0' }] });

    const res = await request(app)
      .post('/volunteer-bookings/recurring/staff')
      .send({ volunteerId: 5, roleId: 2, startDate: '2025-01-01', endDate: '2025-01-03', pattern: 'daily' });

    expect(res.status).toBe(201);
    expect(res.body.recurringId).toBe(30);
    expect(res.body.successes).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
    expect(res.body.skipped).toEqual([]);
    expect(sendTemplatedEmailMock.mock.calls).toHaveLength(9);
    expect(sendTemplatedEmailMock.mock.calls[0][0]).toMatchObject({
      to: 'vol@example.com',
      templateId: 0,
      params: expect.any(Object),
    });
  });

  it('lists recurring bookings for a volunteer', async () => {
    (pool.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: 1,
          role_id: 2,
          start_date: '2025-01-01',
          end_date: '2025-01-10',
          pattern: 'daily',
          days_of_week: [],
        },
      ],
    });
    const res = await request(app).get('/volunteer-bookings/recurring/volunteer/5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 1,
        role_id: 2,
        start_date: '2025-01-01',
        end_date: '2025-01-10',
        pattern: 'daily',
        days_of_week: [],
      },
    ]);
  });

  it('cancels future recurring bookings for a volunteer', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            volunteer_id: 5,
            slot_id: 2,
            email: 'vol@example.com',
            start_time: '09:00:00',
            end_time: '12:00:00',
          },
        ],
      })
      .mockResolvedValue({});

    const res = await request(app).delete(
      '/volunteer-bookings/recurring/10?from=2025-01-02',
    );

    expect(res.status).toBe(200);
    expect(sendTemplatedEmailMock.mock.calls).toHaveLength(3);
  });
});
