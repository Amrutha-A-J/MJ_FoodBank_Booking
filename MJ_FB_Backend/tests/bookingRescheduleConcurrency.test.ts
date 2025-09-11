import express from 'express';
import request from 'supertest';
import { Pool } from 'pg';
import { newDb } from 'pg-mem';

let pool: Pool;
let app: express.Express;

jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
  buildCalendarLinks: () => ({
    googleCalendarLink: '',
    appleCalendarLink: '',
    icsContent: '',
  }),
  saveIcsFile: () => '#',
}));
jest.mock('../src/utils/calendarLinks', () => ({ buildIcsFile: () => '' }));
jest.mock('../src/utils/emailQueue', () => ({ enqueueEmail: jest.fn() }));
jest.mock('../src/utils/bookingEvents', () => ({ sendBookingEvent: jest.fn() }));
jest.mock('../src/utils/opsAlert', () => ({ notifyOps: jest.fn() }));
jest.mock('../src/utils/bookingUtils', () => ({
  countVisitsAndBookingsForMonth: jest.fn().mockResolvedValue(0),
  isDateWithinCurrentOrNextMonth: jest.fn().mockReturnValue(true),
}));
jest.mock('../src/utils/dbUtils', () => ({ hasTable: jest.fn().mockResolvedValue(false) }));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeAccess: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  optionalAuthMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as any).user = { id: 99, role: 'staff' };
    next();
  },
}));
jest.mock('../src/config', () => ({
  __esModule: true,
  default: { clientRescheduleTemplateId: 1, bookingConfirmationTemplateId: 1 },
}));

beforeAll(async () => {
  const db = newDb();
  const pg = db.adapters.createPg();
  pool = new pg.Pool();
  await pool.query(`
    CREATE TABLE slots(id SERIAL PRIMARY KEY, start_time TIME, end_time TIME, max_capacity INTEGER);
    CREATE TABLE bookings(
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      slot_id INTEGER REFERENCES slots(id),
      status TEXT,
      date DATE,
      reschedule_token TEXT,
      is_staff_booking BOOLEAN,
      new_client_id INTEGER,
      request_data TEXT,
      note TEXT
    );
    CREATE TABLE clients(
      client_id INTEGER PRIMARY KEY,
      email TEXT,
      first_name TEXT,
      last_name TEXT
    );
  `);
  await pool.query(`INSERT INTO slots(id,start_time,end_time,max_capacity) VALUES (1,'09:00','10:00',2),(2,'10:00','11:00',2)`);
  await pool.query(`INSERT INTO bookings(user_id,slot_id,status,date,reschedule_token,is_staff_booking) VALUES (1,1,'approved','2099-01-01','tok1',false),(2,1,'approved','2099-01-01','tok2',false),(3,2,'approved','2099-01-01','tok3',false)`);
  await pool.query("INSERT INTO clients(client_id,email,first_name,last_name) VALUES (1,'a@b.c','A','One'),(2,'b@b.c','B','Two'),(3,'c@b.c','C','Three')");

  jest.doMock('../src/db', () => ({ __esModule: true, default: pool }));
  const { default: bookingsRouter } = await import('../src/routes/bookings');
  app = express();
  app.use(express.json());
  app.use('/bookings', bookingsRouter);
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status || 500).json({ message: err.message });
  });
});

afterAll(async () => {
  await pool.end();
});

it('enforces capacity when rescheduling concurrently', async () => {
  const date = '2099-01-01';
  const r1 = await request(app)
    .post('/bookings/reschedule/tok1')
    .send({ slotId: 2, date });
  const r2 = await request(app)
    .post('/bookings/reschedule/tok2')
    .send({ slotId: 2, date });
  expect(r1.status).toBe(200);
  expect(r2.status).toBe(409);
  const count = await pool.query(
    'SELECT COUNT(*) FROM bookings WHERE slot_id=2 AND date=$1',
    [date],
  );
  expect(Number(count.rows[0].count)).toBe(2);
});
