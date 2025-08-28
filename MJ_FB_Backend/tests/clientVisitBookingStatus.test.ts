import request from 'supertest';
import express from 'express';
import clientVisitsRouter from '../src/routes/clientVisits';
import bookingsRouter from '../src/routes/bookings';
import pool from '../src/db';

jest.mock('../src/db');

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: any,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = { id: 99, role: 'staff', access: ['pantry'] };
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
app.use('/client-visits', clientVisitsRouter);
app.use('/bookings', bookingsRouter);
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(err.status || 500).json({ message: err.message });
  },
);

describe('client visit booking integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates booking to visited and avoids duplicate history record', async () => {
    (pool.query as jest.Mock)
      // insert visit
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            date: '2024-01-02',
            clientId: 123,
            weightWithCart: 10,
            weightWithoutCart: 8,
            petItem: 0,
            anonymous: false,
          },
        ],
        rowCount: 1,
      })
      // select client name
      .mockResolvedValueOnce({
        rows: [{ first_name: 'Ann', last_name: 'Client' }],
        rowCount: 1,
      })
      // refresh visit count
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      // find existing booking
      .mockResolvedValueOnce({ rows: [{ id: 55 }], rowCount: 1 })
      // update booking status
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      // booking history query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 55,
            status: 'visited',
            date: '2024-01-02',
            slot_id: 1,
            reason: null,
            start_time: '09:00:00',
            end_time: '09:30:00',
            created_at: '2024-01-02',
            is_staff_booking: false,
            reschedule_token: null,
          },
        ],
        rowCount: 1,
      })
      // visits query should return empty because booking exists
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const visitRes = await request(app)
      .post('/client-visits')
      .send({
        date: '2024-01-02',
        clientId: 123,
        weightWithCart: 10,
        weightWithoutCart: 8,
        petItem: 0,
        anonymous: false,
      });
    expect(visitRes.status).toBe(201);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE bookings SET status'),
      ['visited', 55],
    );

    const historyRes = await request(app)
      .get('/bookings/history?userId=1&includeVisits=true');

    expect(historyRes.status).toBe(200);
    expect(historyRes.body).toHaveLength(1);
    expect(historyRes.body[0].status).toBe('visited');
  });
});

