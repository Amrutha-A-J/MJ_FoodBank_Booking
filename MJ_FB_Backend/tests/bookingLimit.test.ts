process.env.EMAIL_ENABLED = 'false';
import request from 'supertest';
import express from 'express';
import { formatReginaDate } from '../src/utils/dateUtils';

describe('booking monthly limits', () => {
  let app: express.Express;
  let bookingUtils: any;
  let pool: any;
  let bookingRepository: any;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../src/db', () => ({
        __esModule: true,
        default: { connect: jest.fn(), query: jest.fn() },
      }));
      jest.doMock('../src/models/bookingRepository', () => ({
        __esModule: true,
        ...jest.requireActual('../src/models/bookingRepository'),
        checkSlotCapacity: jest.fn(),
        lockClientRow: jest.fn(),
        insertBooking: jest.fn(),
      }));
      jest.doMock('../src/utils/bookingUtils', () => ({
        isDateWithinCurrentOrNextMonth: jest.fn().mockReturnValue(true),
        countVisitsAndBookingsForMonth: jest.fn(),
        findUpcomingBooking: jest.fn().mockResolvedValue(null),
        LIMIT_MESSAGE: 'limit',
      }));
      jest.doMock('../src/middleware/authMiddleware', () => ({
        authMiddleware: (
          req: any,
          _res: express.Response,
          next: express.NextFunction,
        ) => {
          req.user = {
            id: 'v1',
            role: 'volunteer',
            userId: '10',
            userRole: 'shopper',
            email: 'vol@example.com',
          };
          next();
        },
        authorizeRoles: () => (
          _req: express.Request,
          _res: express.Response,
          next: express.NextFunction,
        ) => next(),
        authorizeAccess: () => (
          _req: express.Request,
          _res: express.Response,
          next: express.NextFunction,
        ) => next(),
        optionalAuthMiddleware: (
          req: any,
          _res: express.Response,
          next: express.NextFunction,
        ) => {
          req.user = {
            id: 'v1',
            role: 'volunteer',
            userId: '10',
            userRole: 'shopper',
            email: 'vol@example.com',
          };
          next();
        },
      }));
      pool = require('../src/db').default;
      bookingRepository = require('../src/models/bookingRepository');
      bookingUtils = require('../src/utils/bookingUtils');
      const bookingsRouter = require('../src/routes/bookings').default;
      app = express();
      app.use(express.json());
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
    });
    const defaultQuery = jest
      .fn()
      .mockResolvedValue({ rows: [], rowCount: 0 });
    (pool.connect as jest.Mock).mockResolvedValue({
      query: defaultQuery,
      release: jest.fn(),
    });
    (pool.query as jest.Mock).mockImplementation(defaultQuery);
    (bookingRepository.checkSlotCapacity as jest.Mock).mockResolvedValue(
      undefined,
    );
    (bookingRepository.insertBooking as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  it('rejects third visit in current month', async () => {
    (bookingUtils.countVisitsAndBookingsForMonth as jest.Mock).mockResolvedValue(2);
    const today = formatReginaDate(new Date());
    const res = await request(app).post('/bookings').send({ slotId: 1, date: today });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('limit');
  });

  it('allows next-month booking when current month usage is maxed', async () => {
    (bookingUtils.countVisitsAndBookingsForMonth as jest.Mock).mockImplementation(
      (_id: number, date: string) => {
        const d = new Date(date);
        const now = new Date();
        return Promise.resolve(d.getMonth() === now.getMonth() ? 2 : 0);
      },
    );
    const now = new Date();
    const nextMonth = formatReginaDate(
      new Date(now.getFullYear(), now.getMonth() + 1, 5),
    );
    const res = await request(app)
      .post('/bookings')
      .send({ slotId: 1, date: nextMonth });
    expect(res.body.status).toBe('approved');
  });

  it('only approves one of two simultaneous bookings over the limit', async () => {
    (bookingUtils.countVisitsAndBookingsForMonth as jest.Mock)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    const today = formatReginaDate(new Date());

    const [res1, res2] = await Promise.all([
      request(app).post('/bookings').send({ slotId: 1, date: today }),
      request(app).post('/bookings').send({ slotId: 1, date: today }),
    ]);

    const success = [res1, res2].find(r => r.status === 201);
    const failure = [res1, res2].find(r => r.status === 400);
    expect(success?.body.status).toBe('approved');
    expect(failure?.body.message).toBe('limit');
  });
});
