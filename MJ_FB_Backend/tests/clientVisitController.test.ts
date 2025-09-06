import request from 'supertest';
import express from 'express';
import clientVisitsRouter from '../src/routes/clientVisits';
import pool from '../src/db';

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
            adults: 0,
            children: 0,
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
        adults: 0,
        children: 0,
      });

    expect(res.status).toBe(201);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO client_visits'),
      ['2024-01-02', 123, 10, 9, 0, false, 'bring ID', 0, 0],
    );
    expect(res.body.note).toBe('bring ID');
  });

  it('persists note on update', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ client_id: 123 }], rowCount: 1 }) // existing
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
            adults: 0,
            children: 0,
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
        adults: 0,
        children: 0,
      });

    expect(res.status).toBe(200);
    expect((pool.query as jest.Mock).mock.calls[1]).toEqual([
      expect.stringContaining('UPDATE client_visits'),
      ['2024-01-02', 123, 10, 9, 0, false, 'updated note', 0, 0, '7'],
    ]);
    expect(res.body.note).toBe('updated note');
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
          adults: 0,
          children: 0,
          clientName: 'Ann Client',
        },
      ],
      rowCount: 1,
    });

    const res = await request(app).get('/client-visits?date=2024-01-02');
    expect(res.status).toBe(200);
    expect(res.body[0].note).toBe('listed note');
  });
});
