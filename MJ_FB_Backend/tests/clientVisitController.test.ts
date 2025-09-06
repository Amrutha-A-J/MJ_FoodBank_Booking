import request from 'supertest';
import express from 'express';
import clientVisitsRouter from '../src/routes/clientVisits';
import pool from '../src/db';
import { updateBooking } from '../src/models/bookingRepository';

jest.mock('../src/models/bookingRepository', () => ({
  __esModule: true,
  updateBooking: jest.fn(),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: any, _res: express.Response, next: express.NextFunction) => {
    (_req as any).user = { id: 99, role: 'staff', access: ['pantry'] };
    next();
  },
  authorizeAccess: () => (_req: any, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: any, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (_req: any, _res: express.Response, next: express.NextFunction) => next(),
}));

const app = express();
app.use(express.json());
app.use('/client-visits', clientVisitsRouter);

describe('client visit notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists note on create', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0 }) // duplicate check
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            date: '2024-01-02',
            clientId: 123,
            weightWithCart: 10,
            weightWithoutCart: 9,
            petItem: 0,
            anonymous: false,
            note: 'bring ID',
            adults: 1,
            children: 2,
          },
        ],
        rowCount: 1,
      }) // insert
      .mockResolvedValueOnce({ rows: [{ first_name: 'Ann', last_name: 'Client' }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({}) // refresh count
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // same-day booking
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // other bookings
      .mockResolvedValueOnce({}); // COMMIT

    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app)
      .post('/client-visits')
      .send({
        date: '2024-01-02',
        clientId: 123,
        weightWithCart: 10,
        weightWithoutCart: 9,
        note: 'bring ID',
        adults: 1,
        children: 2,
      });

    expect(res.status).toBe(201);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      ['2024-01-02', 123, 10, 9, 0, false, 'bring ID', 1, 2],
    );
    expect(res.body.note).toBe('bring ID');
    expect(res.body.adults).toBe(1);
    expect(res.body.children).toBe(2);
  });

  it('rejects duplicate visit on create', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 1 }) // duplicate check
      .mockResolvedValueOnce({}); // ROLLBACK
    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app)
      .post('/client-visits')
      .send({
        date: '2024-01-02',
        clientId: 123,
        weightWithCart: 10,
        weightWithoutCart: 9,
        adults: 1,
        children: 2,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/duplicate/i);
  });

  it('persists note on update', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ client_id: 123 }], rowCount: 1 }) // existing
      .mockResolvedValueOnce({ rowCount: 0 }) // duplicate check
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            date: '2024-01-02',
            clientId: 123,
            weightWithCart: 10,
            weightWithoutCart: 9,
            petItem: 0,
            anonymous: false,
            note: 'updated note',
            adults: 1,
            children: 2,
          },
        ],
        rowCount: 1,
      }) // update
      .mockResolvedValueOnce({ rows: [{ first_name: 'Ann', last_name: 'Client' }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({}); // refresh count

    const res = await request(app)
      .put('/client-visits/7')
      .send({
        date: '2024-01-02',
        clientId: 123,
        weightWithCart: 10,
        weightWithoutCart: 9,
        note: 'updated note',
        adults: 1,
        children: 2,
      });

    expect(res.status).toBe(200);
    expect((pool.query as jest.Mock).mock.calls[1]).toEqual([
      expect.stringContaining('UPDATE client_visits'),
      ['2024-01-02', 123, 10, 9, 0, false, 'updated note', 1, 2, '7'],
    ]);
    expect(res.body.note).toBe('updated note');
    expect(res.body.adults).toBe(1);
    expect(res.body.children).toBe(2);
  });

  it('lists notes', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        {
          id: 7,
          date: '2024-01-02',
          clientId: 123,
          weightWithCart: null,
          weightWithoutCart: null,
          petItem: 0,
          anonymous: false,
          note: 'listed note',
          adults: 1,
          children: 2,
          clientName: 'Ann Client',
        },
      ],
      rowCount: 1,
    });

    const res = await request(app).get('/client-visits?date=2024-01-02');
    expect(res.status).toBe(200);
    expect(res.body[0].note).toBe('listed note');
    expect(res.body[0].adults).toBe(1);
    expect(res.body[0].children).toBe(2);
  });

  it('allows null weights on create', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0 }) // duplicate check
      .mockResolvedValueOnce({
        rows: [
          {
            id: 8,
            date: '2024-01-03',
            clientId: 123,
            weightWithCart: null,
            weightWithoutCart: null,
            petItem: 0,
            anonymous: false,
            note: null,
            adults: 1,
            children: 2,
          },
        ],
        rowCount: 1,
      }) // insert
      .mockResolvedValueOnce({ rows: [{ first_name: 'Ann', last_name: 'Client' }], rowCount: 1 }) // select client
      .mockResolvedValueOnce({}) // refresh count
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // same-day booking
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // other bookings
      .mockResolvedValueOnce({}); // COMMIT

    (pool.connect as jest.Mock).mockResolvedValue({ query: queryMock, release: jest.fn() });

    const res = await request(app)
      .post('/client-visits')
      .send({ date: '2024-01-03', clientId: 123, adults: 1, children: 2 });

    expect(res.status).toBe(201);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      ['2024-01-03', 123, null, null, 0, false, null, 1, 2],
    );
  });

  it('reverts booking when visit deleted', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ client_id: 123, date: '2024-01-02' }], rowCount: 1 }) // existing
      .mockResolvedValueOnce({}) // delete
      .mockResolvedValueOnce({}) // refresh count
      .mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 }); // booking

    const res = await request(app).delete('/client-visits/7');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Deleted');
    expect(updateBooking).toHaveBeenCalledWith(5, { status: 'approved', note: null }, pool);
  });
});

describe('client visit stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates stats by day', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { date: '2024-01-01', total: 3, adults: 5, children: 2 },
        { date: '2024-01-02', total: 1, adults: 2, children: 0 },
      ],
      rowCount: 2,
    });

    const res = await request(app).get('/client-visits/stats?days=7');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { date: '2024-01-01', total: 3, adults: 5, children: 2 },
      { date: '2024-01-02', total: 1, adults: 2, children: 0 },
    ]);
    expect((pool.query as jest.Mock).mock.calls[0][1]).toEqual([7]);
  });

  it('aggregates stats by month', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [
        { month: new Date('2024-01-01'), clients: 2, adults: 3, children: 1 },
        { month: new Date('2024-02-01'), clients: 3, adults: 4, children: 2 },
      ],
      rowCount: 2,
    });

    const res = await request(app).get('/client-visits/stats?group=month&months=2');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { month: '2024-01', clients: 2, adults: 3, children: 1 },
      { month: '2024-02', clients: 3, adults: 4, children: 2 },
    ]);
    expect((pool.query as jest.Mock).mock.calls[0][1]).toEqual([2]);
  });

  it('validates days param', async () => {
    const res = await request(app).get('/client-visits/stats?days=abc');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('validates months param', async () => {
    const res = await request(app).get('/client-visits/stats?group=month&months=abc');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });
});
