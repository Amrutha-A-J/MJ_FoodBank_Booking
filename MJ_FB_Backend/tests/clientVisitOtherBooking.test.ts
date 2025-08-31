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

describe('adjust other bookings on visit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks future booking as visited and moves date', async () => {
    const mockClient = { query: jest.fn(), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
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
      }) // insert visit
      .mockResolvedValueOnce({
        rows: [{ first_name: 'Ann', last_name: 'Client' }],
        rowCount: 1,
      }) // select client
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // same-day booking
      .mockResolvedValueOnce({
        rows: [{ id: 55, date: '2024-01-20' }],
        rowCount: 1,
      }) // other booking
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // update booking
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // refresh count
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    ;(pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 55,
            status: 'visited',
            date: '2024-01-02',
            slot_id: null,
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

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE bookings SET status=$1, date=$2, slot_id=NULL WHERE id=$3'),
      ['visited', '2024-01-02', 55],
    );

    const historyRes = await request(app)
      .get('/bookings/history?userId=1&includeVisits=true');
    expect(historyRes.status).toBe(200);
    expect(historyRes.body).toHaveLength(1);
    expect(historyRes.body[0].date).toBe('2024-01-02');
    expect(historyRes.body[0].status).toBe('visited');
  });

  it('marks past booking as no_show', async () => {
    const mockClient = { query: jest.fn(), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            date: '2024-01-15',
            clientId: 123,
            weightWithCart: 10,
            weightWithoutCart: 8,
            petItem: 0,
            anonymous: false,
          },
        ],
        rowCount: 1,
      }) // insert visit
      .mockResolvedValueOnce({
        rows: [{ first_name: 'Ann', last_name: 'Client' }],
        rowCount: 1,
      }) // select client
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // same-day booking
      .mockResolvedValueOnce({
        rows: [{ id: 66, date: '2024-01-10' }],
        rowCount: 1,
      }) // other booking earlier in month
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // update booking
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // refresh count
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const visitRes = await request(app)
      .post('/client-visits')
      .send({
        date: '2024-01-15',
        clientId: 123,
        weightWithCart: 10,
        weightWithoutCart: 8,
        petItem: 0,
        anonymous: false,
      });
    expect(visitRes.status).toBe(201);

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE bookings SET status=$1, slot_id=NULL WHERE id=$2'),
      ['no_show', 66],
    );
  });
});
