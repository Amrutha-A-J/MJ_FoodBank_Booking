import request from 'supertest';
import express from 'express';
import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';
import pool from '../src/db';

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
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
app.use('/volunteer-bookings', volunteerBookingsRouter);

describe('createVolunteerBookingForVolunteer date validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for malformed date', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            role_id: 2,
            max_volunteers: 3,
            start_time: '09:00:00',
            end_time: '12:00:00',
            category_name: 'Pantry',
            role_name: 'Greeter',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] });

    const res = await request(app)
      .post('/volunteer-bookings/staff')
      .send({ volunteerId: 1, roleId: 1, date: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid date');
    expect((pool.query as jest.Mock)).toHaveBeenCalledTimes(2);
  });

  it('returns 400 for past date', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            role_id: 2,
            max_volunteers: 3,
            start_time: '09:00:00',
            end_time: '12:00:00',
            category_name: 'Pantry',
            role_name: 'Greeter',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] });

    const res = await request(app)
      .post('/volunteer-bookings/staff')
      .send({ volunteerId: 1, roleId: 1, date: '2020-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Date cannot be in the past');
    expect((pool.query as jest.Mock)).toHaveBeenCalledTimes(2);
  });
});

