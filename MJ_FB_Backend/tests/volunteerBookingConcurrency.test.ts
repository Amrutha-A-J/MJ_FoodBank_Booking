import express from 'express';
import request from 'supertest';
import { newDb } from 'pg-mem';
import type { Pool } from 'pg';

const db = newDb();
const { Pool: PgPool } = db.adapters.createPg();
const pool: Pool = new PgPool();

beforeAll(async () => {

  await pool.query(
    'CREATE TABLE volunteer_master_roles(id SERIAL PRIMARY KEY, name TEXT)',
  );
  await pool.query(
    'CREATE TABLE volunteer_roles(id SERIAL PRIMARY KEY, name TEXT, category_id INTEGER REFERENCES volunteer_master_roles(id))',
  );
  await pool.query(
    `CREATE TABLE volunteer_slots(
      slot_id SERIAL PRIMARY KEY,
      role_id INTEGER REFERENCES volunteer_roles(id),
      start_time TIME,
      end_time TIME,
      max_volunteers INTEGER,
      is_wednesday_slot BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE
    )`,
  );
  await pool.query(
    'CREATE TABLE volunteer_trained_roles(volunteer_id INTEGER, role_id INTEGER)',
  );
  await pool.query(
    `CREATE TABLE volunteer_bookings(
      id SERIAL PRIMARY KEY,
      slot_id INTEGER REFERENCES volunteer_slots(slot_id),
      volunteer_id INTEGER,
      date DATE,
      status TEXT,
      reschedule_token TEXT,
      recurring_id INTEGER,
      reason TEXT
    )`,
  );
  await pool.query('CREATE TABLE holidays(date DATE PRIMARY KEY)');
  await pool.query(
    'CREATE UNIQUE INDEX ub_unique_slot_date ON volunteer_bookings(slot_id, date)'
  );

  await pool.query("INSERT INTO volunteer_master_roles(name) VALUES ('Front')");
  await pool.query(
    "INSERT INTO volunteer_roles(name, category_id) VALUES ('Greeter',1)",
  );
  await pool.query(
    `INSERT INTO volunteer_slots(
      slot_id, role_id, start_time, end_time, max_volunteers, is_wednesday_slot, is_active
    ) VALUES (1,1,'09:00','12:00',1,false,true)`,
  );
  await pool.query('TRUNCATE volunteer_bookings RESTART IDENTITY');
  await pool.query('TRUNCATE volunteer_trained_roles');
  await pool.query(
    'INSERT INTO volunteer_trained_roles(volunteer_id, role_id) VALUES (1,1),(2,1)',
  );
});

afterAll(async () => {
  await pool.end();
});

// Mock db module after pool initialized
jest.mock('../src/utils/emailUtils', () => ({
  sendTemplatedEmail: jest.fn(),
  buildCancelRescheduleLinks: () => ({ cancelLink: '', rescheduleLink: '' }),
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

// Module mock for db depends on pool; done after potential initialization
jest.mock('../src/db', () => ({ __esModule: true, default: pool }));

import volunteerBookingsRouter from '../src/routes/volunteer/volunteerBookings';

const app = express();
app.use(express.json());
app.use('/volunteer-bookings', volunteerBookingsRouter);

describe('concurrent volunteer bookings', () => {
  it('does not exceed max_volunteers', async () => {
    const date = '2099-01-01';
    await pool.query('TRUNCATE volunteer_bookings RESTART IDENTITY');

    const p1 = request(app)
      .post('/volunteer-bookings/staff')
      .send({ volunteerId: 1, roleId: 1, date });
    const p2 = request(app)
      .post('/volunteer-bookings/staff')
      .send({ volunteerId: 2, roleId: 1, date });

    const results = await Promise.all([p1, p2]);
    const successes = results.filter(r => r.status === 201);
    const failures = results.filter(r => r.status === 400);

    expect(successes.length + failures.length).toBe(2);
    expect(successes.length).toBe(1);
    const count = await pool.query(
      'SELECT COUNT(*) FROM volunteer_bookings WHERE slot_id=1 AND date=$1',
      [date],
    );
    expect(Number(count.rows[0].count)).toBe(1);
  });
});

