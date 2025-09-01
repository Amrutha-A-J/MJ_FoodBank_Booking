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
    CREATE TABLE IF NOT EXISTS volunteer_master_roles(id SERIAL PRIMARY KEY, name TEXT);
    CREATE TABLE IF NOT EXISTS volunteer_roles(id SERIAL PRIMARY KEY, name TEXT, category_id INTEGER REFERENCES volunteer_master_roles(id));
    CREATE TABLE IF NOT EXISTS volunteer_slots(slot_id SERIAL PRIMARY KEY, role_id INTEGER REFERENCES volunteer_roles(id), start_time TIME, end_time TIME, max_volunteers INTEGER, is_wednesday_slot BOOLEAN DEFAULT FALSE, is_active BOOLEAN DEFAULT TRUE);
    CREATE TABLE IF NOT EXISTS volunteer_trained_roles(volunteer_id INTEGER, role_id INTEGER);
    CREATE TABLE IF NOT EXISTS volunteer_bookings(id SERIAL PRIMARY KEY, slot_id INTEGER REFERENCES volunteer_slots(slot_id), volunteer_id INTEGER, date DATE, status TEXT, reschedule_token TEXT, recurring_id INTEGER, reason TEXT);
    CREATE TABLE IF NOT EXISTS holidays(date DATE PRIMARY KEY);
  `);
  await pool.query(`INSERT INTO volunteer_master_roles(name) VALUES ('Front') ON CONFLICT DO NOTHING`);
  await pool.query(`INSERT INTO volunteer_roles(name, category_id) VALUES ('Greeter',1) ON CONFLICT DO NOTHING`);
  await pool.query(`
    INSERT INTO volunteer_slots(slot_id, role_id, start_time, end_time, max_volunteers, is_wednesday_slot, is_active)
    VALUES (1,1,'09:00','12:00',1,false,true)
    ON CONFLICT (slot_id) DO UPDATE SET max_volunteers=1
  `);
  await pool.query(`TRUNCATE volunteer_bookings RESTART IDENTITY`);
  await pool.query(`TRUNCATE volunteer_trained_roles`);
  await pool.query(`INSERT INTO volunteer_trained_roles(volunteer_id, role_id) VALUES (1,1),(2,1)`);

  // Mock db and import router after pool is ready so handlers use initialized pool
  jest.doMock('../src/db', () => ({ __esModule: true, default: pool }));
  const { default: volunteerBookingsRouter } = await import('../src/routes/volunteer/volunteerBookings');
  app = express();
  app.use(express.json());
  app.use('/volunteer-bookings', volunteerBookingsRouter);
});

afterAll(async () => {
  await pool.end();
});

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

describe('concurrent volunteer bookings', () => {
  it('does not exceed max_volunteers', async () => {
    const date = '2099-01-01';
    await pool.query('TRUNCATE volunteer_bookings RESTART IDENTITY');

    const r1 = await request(app)
      .post('/volunteer-bookings/staff')
      .send({ volunteerId: 1, roleId: 1, date });
    const r2 = await request(app)
      .post('/volunteer-bookings/staff')
      .send({ volunteerId: 2, roleId: 1, date });

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(400);
    const count = await pool.query(
      'SELECT COUNT(*) FROM volunteer_bookings WHERE slot_id=1 AND date=$1',
      [date],
    );
    expect(Number(count.rows[0].count)).toBe(1);
  });
});

