import express from 'express';
import request from 'supertest';
import { Pool } from 'pg';
import { newDb } from 'pg-mem';

let pool: Pool;
let app: express.Express;

jest.mock('../src/utils/emailUtils', () => ({
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
  buildCalendarLinks: () => ({
    googleCalendarLink: '',
    appleCalendarLink: '',
    icsContent: '',
  }),
  saveIcsFile: () => '#',
}));

jest.mock('../src/utils/emailQueue', () => ({
  __esModule: true,
  enqueueEmail: jest.fn(),
}));

jest.mock('../src/controllers/clientVisitController', () => ({
  __esModule: true,
  refreshClientVisitCount: jest.fn(),
  getClientBookingsThisMonth: jest.fn().mockResolvedValue(0),
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    (req as any).user = {
      id: 1,
      userId: 1,
      role: 'shopper',
      type: 'client',
      name: 'Test User',
      email: 'client@example.com',
    };
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
  __esModule: true,
  isDateWithinCurrentOrNextMonth: jest.fn().mockReturnValue(true),
  countVisitsAndBookingsForMonth: jest.fn().mockResolvedValue(0),
  findUpcomingBooking: jest.fn().mockResolvedValue(null),
  LIMIT_MESSAGE: 'limit',
}));

beforeAll(async () => {
  const db = newDb();
  const pg = db.adapters.createPg();
  pool = new pg.Pool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients(
      client_id INTEGER PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      bookings_this_month INTEGER DEFAULT 0,
      booking_count_last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
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
      date DATE,
      is_anonymous BOOLEAN DEFAULT false
    );
    CREATE TABLE IF NOT EXISTS holidays(
      date DATE PRIMARY KEY
    );
    CREATE UNIQUE INDEX bookings_user_date_unique_active
      ON bookings(user_id, date)
      WHERE status <> 'cancelled';
  `);

  await pool.query(`INSERT INTO clients(client_id, first_name, last_name, email)
    VALUES (1,'Test','User','client@example.com')
    ON CONFLICT (client_id) DO NOTHING`);
  await pool.query(`INSERT INTO slots(id, start_time, end_time, max_capacity)
    VALUES (1,'09:00','09:30',3)
    ON CONFLICT (id) DO UPDATE SET max_capacity=EXCLUDED.max_capacity`);

  jest.doMock('../src/db', () => ({ __esModule: true, default: pool }));
  const { default: bookingsRouter } = await import('../src/routes/bookings');
  app = express();
  app.use(express.json());
  app.use('/bookings', bookingsRouter);
});

afterAll(async () => {
  await pool.end();
  jest.unmock('../src/middleware/authMiddleware');
  jest.unmock('../src/utils/bookingUtils');
  jest.unmock('../src/utils/emailUtils');
  jest.unmock('../src/utils/emailQueue');
  jest.unmock('../src/controllers/clientVisitController');
  jest.resetModules();
});

beforeEach(async () => {
  await pool.query('TRUNCATE bookings RESTART IDENTITY');
});

describe('client rebooks after cancellation', () => {
  it('allows creating a new booking on the same date', async () => {
    const date = '2099-01-15';
    await pool.query(
      `INSERT INTO bookings(user_id, slot_id, status, date, is_staff_booking, reschedule_token)
       VALUES ($1, $2, 'cancelled', $3, false, 'old-token')`,
      [1, 1, date],
    );

    const res = await request(app)
      .post('/bookings')
      .send({ slotId: 1, date });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('approved');
  });
});

