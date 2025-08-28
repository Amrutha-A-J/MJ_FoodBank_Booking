import request from 'supertest';
import express from 'express';

describe('booking date validation', () => {
  let app: express.Express;

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
        insertBooking: jest.fn(),
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
      jest.doMock('../src/utils/emailQueue', () => ({
        __esModule: true,
        enqueueEmail: jest.fn(),
      }));
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
  });

  it('returns 400 for malformed date', async () => {
    const res = await request(app).post('/bookings').send({ slotId: 1, date: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for impossible date', async () => {
    const res = await request(app).post('/bookings').send({ slotId: 1, date: '2024-02-30' });
    expect(res.status).toBe(400);
  });
});

