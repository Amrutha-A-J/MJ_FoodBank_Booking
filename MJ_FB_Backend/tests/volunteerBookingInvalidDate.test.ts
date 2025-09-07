import request from 'supertest';
import express from 'express';

describe('volunteer booking date validation', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('../src/db', () => ({
        __esModule: true,
        default: { query: jest.fn() },
      }));
      const sendTemplatedEmail = jest.fn();
      jest.doMock('../src/utils/emailUtils', () => ({
        sendTemplatedEmail,
        buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
        buildCalendarLinks: () => ({
          googleCalendarLink: '',
          outlookCalendarLink: '',
          appleCalendarLink: '',
          icsContent: '',
        }),
        saveIcsFile: () => '#',
      }));
      jest.doMock('../src/utils/emailQueue', () => ({ enqueueEmail: jest.fn() }));
      jest.doMock('../src/middleware/authMiddleware', () => ({
        authMiddleware: (
          req: any,
          _res: express.Response,
          next: express.NextFunction,
        ) => {
          req.user = { id: 1, email: 'vol@example.com', role: 'volunteer' };
          next();
        },
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
      const router = require('../src/routes/volunteer/volunteerBookings').default;
      app = express();
      app.use(express.json());
      app.use('/volunteer-bookings', router);
    });
  });

  it('returns 400 for malformed date', async () => {
    const res = await request(app)
      .post('/volunteer-bookings')
      .send({ roleId: 1, date: 'not-a-date' });
    expect(res.status).toBe(400);
    const pool = require('../src/db').default;
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns 400 for past date', async () => {
    const res = await request(app)
      .post('/volunteer-bookings')
      .send({ roleId: 1, date: '2020-01-01' });
    expect(res.status).toBe(400);
    const pool = require('../src/db').default;
    expect(pool.query).not.toHaveBeenCalled();
  });
});
