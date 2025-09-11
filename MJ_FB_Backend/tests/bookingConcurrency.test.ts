import express from 'express';
import request from 'supertest';
import { Pool } from 'pg';
import { newDb } from 'pg-mem';

let pool: Pool;
let app: express.Express;

beforeAll(async () => {
  const db = newDb();
  const pg = db.adapters.createPg();
  pool = new pg.Pool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients(
      client_id INTEGER PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS slots(
      id SERIAL PRIMARY KEY,
      start_time TIME,
      end_time TIME,
      max_capacity INTEGER
    );
    CREATE TABLE IF NOT EXISTS bookings(
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      new_client_id INTEGER,
      slot_id INTEGER REFERENCES slots(id),
      status TEXT,
      request_data TEXT,
      note TEXT,
      date DATE,
      is_staff_booking BOOLEAN,
      reschedule_token TEXT
    );
    CREATE TABLE IF NOT EXISTS client_visits(
      id SERIAL PRIMARY KEY,
      client_id INTEGER,
      date DATE
    );
    CREATE TABLE IF NOT EXISTS holidays(
      date DATE PRIMARY KEY
    );
  `);

  await pool.query(`INSERT INTO clients(client_id, first_name, last_name, email)
    VALUES (1,'A','One','a@example.com'), (2,'B','Two','b@example.com')
    ON CONFLICT (client_id) DO NOTHING`);
  await pool.query(`
    INSERT INTO slots(id, start_time, end_time, max_capacity)
    VALUES (1,'09:00','10:00',1)
    ON CONFLICT (id) DO UPDATE SET max_capacity=1
  `);

  jest.doMock('../src/db', () => ({ __esModule: true, default: pool }));
  const { default: bookingsRouter } = await import('../src/routes/bookings');
  app = express();
  app.use(express.json());
  app.use('/bookings', bookingsRouter);
});

afterAll(async () => {
  await pool.end();
  jest.unmock('../src/middleware/authMiddleware');
  jest.resetModules();
});

jest.mock('../src/utils/emailUtils', () => ({
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
  buildCalendarLinks: () => ({
    googleCalendarLink: '',
    appleCalendarLink: '',
    icsContent: '',
  }),
  saveIcsFile: () => '#',
}));
jest.mock('../src/utils/emailQueue', () => ({ enqueueEmail: jest.fn() }));
jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    (req as any).user = { id: 99, role: 'staff' };
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
jest.mock('../src/utils/bookingUtils', () => ({
  isDateWithinCurrentOrNextMonth: jest.fn().mockReturnValue(true),
  countVisitsAndBookingsForMonth: jest.fn().mockResolvedValue(0),
  findUpcomingBooking: jest.fn().mockResolvedValue(null),
  LIMIT_MESSAGE: 'limit',
}));

describe('concurrent bookings', () => {
  it('does not exceed max_capacity', async () => {
    const date = '2099-01-01';
    await pool.query('TRUNCATE bookings RESTART IDENTITY');

    const r1 = await request(app)
      .post('/bookings/staff')
      .send({ userId: 1, slotId: 1, date });
    const r2 = await request(app)
      .post('/bookings/staff')
      .send({ userId: 2, slotId: 1, date });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(409);
    const count = await pool.query(
      'SELECT COUNT(*) FROM bookings WHERE slot_id=1 AND date=$1',
      [date],
    );
    expect(Number(count.rows[0].count)).toBe(1);
  });
});

