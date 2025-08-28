import pool from '../db';
import { Pool, PoolClient } from 'pg';
import { formatReginaDate } from '../utils/dateUtils';

export type Queryable = Pool | PoolClient;

export class SlotCapacityError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function checkSlotCapacity(
  slotId: number,
  date: string,
  client: Queryable = pool,
) {
  const reginaDate = formatReginaDate(date);
  const slotRes = await client.query(
    'SELECT max_capacity FROM slots WHERE id = $1 FOR UPDATE',
    [slotId],
  );
  if ((slotRes.rowCount ?? 0) === 0) {
    throw new SlotCapacityError('Invalid slot');
  }
  const approvedCountRes = await client.query(
    `SELECT COUNT(*) FROM bookings WHERE slot_id=$1 AND date=$2 AND status='approved'`,
    [slotId, reginaDate],
  );
  const approvedCount = Number(approvedCountRes.rows[0].count);
  if (approvedCount >= slotRes.rows[0].max_capacity) {
    throw new SlotCapacityError('Slot full on selected date', 409);
  }
}

export async function insertBooking(
  userId: number,
  slotId: number,
  status: string,
  requestData: string,
  date: string,
  isStaffBooking: boolean,
  rescheduleToken: string,
  client: Queryable = pool,
) {
  const reginaDate = formatReginaDate(date);
  await client.query(
    `INSERT INTO bookings (user_id, slot_id, status, request_data, date, is_staff_booking, reschedule_token)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, slotId, status, requestData, reginaDate, isStaffBooking, rescheduleToken],
  );
}

export async function fetchBookingById(id: number, client: Queryable = pool) {
  const res = await client.query('SELECT * FROM bookings WHERE id = $1', [id]);
  return res.rows[0];
}

export async function fetchBookingByToken(token: string, client: Queryable = pool) {
  const res = await client.query('SELECT * FROM bookings WHERE reschedule_token = $1', [token]);
  return res.rows[0];
}

export async function updateBooking(
  id: number,
  fields: Record<string, any>,
  client: Queryable = pool,
) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((key, idx) => `${key}=$${idx + 2}`).join(', ');
  const params = [id, ...keys.map((k) => fields[k])];
  await client.query(`UPDATE bookings SET ${setClause} WHERE id=$1`, params);
}

export async function fetchBookings(
  status: string | undefined,
  date?: string,
  clientIds?: number[],
  client: Queryable = pool,
) {
  const params: any[] = [];
  const where: string[] = [];
  if (status) {
    params.push(status);
    where.push(`b.status = $${params.length}`);
  }
  if (date) {
    params.push(formatReginaDate(date));
    where.push(`b.date = $${params.length}`);
  }
  if (clientIds && clientIds.length > 0) {
    params.push(clientIds);
    where.push(`u.client_id = ANY($${params.length})`);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const res = await client.query(
    `SELECT
        b.id, b.status, b.date, b.user_id, b.slot_id, b.is_staff_booking,
        b.reschedule_token,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email, u.phone as user_phone,
        u.client_id, u.profile_link,
        COALESCE(v.visits, 0) AS bookings_this_month,
        s.start_time, s.end_time
        FROM bookings b
        INNER JOIN clients u ON b.user_id = u.id
        INNER JOIN slots s ON b.slot_id = s.id
        LEFT JOIN (
          SELECT client_id, DATE_TRUNC('month', date) AS month, COUNT(*) AS visits
          FROM client_visits
          GROUP BY client_id, month
        ) v ON v.client_id = u.client_id
          AND b.date BETWEEN v.month AND (v.month + INTERVAL '1 month' - INTERVAL '1 day')
      ${whereClause}
      ORDER BY b.date ASC, s.start_time ASC`,
    params,
  );
  return res.rows;
}

export async function fetchBookingHistory(
  userId: number,
  past: boolean,
  status: string | undefined,
  client: Queryable = pool,
) {
  const params: any[] = [userId];
  let where = `b.user_id = $1 AND b.date >= CURRENT_DATE - INTERVAL '6 months'`;
  if (past) {
    where += ' AND b.date < CURRENT_DATE';
  }
  if (status) {
    params.push(status);
    where += ` AND b.status = $${params.length}`;
  }
  const res = await client.query(
    `SELECT b.id, b.status, b.date, b.slot_id, b.request_data AS reason, s.start_time, s.end_time, b.created_at, b.is_staff_booking, b.reschedule_token
       FROM bookings b
       INNER JOIN slots s ON b.slot_id = s.id
       WHERE ${where}
       ORDER BY b.created_at DESC`,
    params,
  );
  return res.rows;
}

  export async function insertWalkinUser(
    firstName: string,
    lastName: string,
    email: string,
    clientId: number,
    client: Queryable,
  ) {
    const profileLink = `https://portal.link2feed.ca/org/1605/intake/${clientId}`;
    const res = await client.query(
      `INSERT INTO clients (first_name, last_name, email, phone, client_id, role, profile_link)
       VALUES ($1, $2, $3, NULL, $4, 'shopper', $5) RETURNING id`,
      [firstName, lastName, email, clientId, profileLink],
    );
    return res.rows[0].id;
  }

