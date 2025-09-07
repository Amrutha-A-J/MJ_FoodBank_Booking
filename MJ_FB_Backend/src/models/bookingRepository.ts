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
  userId: number | null,
  slotId: number,
  status: string,
  requestData: string,
  date: string,
  isStaffBooking: boolean,
  rescheduleToken: string,
  newClientId: number | null = null,
  note: string | null = null,
  client: Queryable = pool,
) {
  const reginaDate = formatReginaDate(date);
  const res = await client.query(
    `INSERT INTO bookings (user_id, new_client_id, slot_id, status, request_data, note, date, is_staff_booking, reschedule_token)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      userId,
      newClientId,
      slotId,
      status,
      requestData,
      note,
      reginaDate,
      isStaffBooking,
      rescheduleToken,
    ],
  );
  return res.rows[0].id;
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
  const whitelist = [
    'slot_id',
    'date',
    'status',
    'request_data',
    'note',
    'reschedule_token',
  ];
  const keys = Object.keys(fields).filter((k) => whitelist.includes(k));
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
        b.id, b.status, b.date, b.user_id, b.new_client_id, b.slot_id, b.is_staff_booking,
        b.reschedule_token, b.note,
        COALESCE(u.first_name || ' ' || u.last_name, nc.name) as user_name,
        COALESCE(u.email, nc.email) as user_email,
        COALESCE(u.phone, nc.phone) as user_phone,
        u.client_id, u.profile_link,
        COALESCE(v.visits, 0) AS visits_this_month,
        COALESCE(ab.approved, 0) AS approved_bookings_this_month,
        s.start_time, s.end_time
        FROM bookings b
        LEFT JOIN clients u ON b.user_id = u.client_id
        LEFT JOIN new_clients nc ON b.new_client_id = nc.id
        INNER JOIN slots s ON b.slot_id = s.id
        LEFT JOIN (
          SELECT client_id, DATE_TRUNC('month', date) AS month, COUNT(*) AS visits
          FROM client_visits
          GROUP BY client_id, month
        ) v ON v.client_id = u.client_id
          AND b.date BETWEEN v.month AND (v.month + INTERVAL '1 month' - INTERVAL '1 day')
        LEFT JOIN (
          SELECT user_id AS client_id, DATE_TRUNC('month', date) AS month, COUNT(*) AS approved
          FROM bookings
          WHERE status = 'approved'
          GROUP BY user_id, month
        ) ab ON ab.client_id = u.client_id
          AND b.date BETWEEN ab.month AND (ab.month + INTERVAL '1 month' - INTERVAL '1 day')
      ${whereClause}
      ORDER BY b.date ASC, s.start_time ASC`,
    params,
  );
  return res.rows;
}

export async function fetchBookingsForReminder(
  date: string,
  client: Queryable = pool,
) {
  const res = await client.query(
    `SELECT
        COALESCE(u.email, nc.email) as user_email,
        s.start_time,
        s.end_time,
        b.reschedule_token
       FROM bookings b
       LEFT JOIN clients u ON b.user_id = u.client_id
       LEFT JOIN new_clients nc ON b.new_client_id = nc.id
       INNER JOIN slots s ON b.slot_id = s.id
       WHERE b.status = 'approved' AND b.date = $1`,
    [formatReginaDate(date)],
  );
  return res.rows;
}

export async function fetchBookingHistory(
  userIds: number[],
  past: boolean,
  status: string | undefined,
  includeVisits = false,
  limit?: number,
  offset?: number,
  includeClientNotes = true,
  client: Queryable = pool,
) {
  const params: any[] = [userIds];
  let where = `b.user_id = ANY($1)`;
  if (past) {
    where += ' AND b.date < CURRENT_DATE';
  }
  if (status) {
    params.push(status);
    where += ` AND b.status = $${params.length}`;
  }
  let limitOffset = '';
  if (typeof limit === 'number') {
    params.push(limit);
    limitOffset += ` LIMIT $${params.length}`;
  }
  if (typeof offset === 'number') {
    params.push(offset);
    limitOffset += ` OFFSET $${params.length}`;
  }
  const clientNoteSelect = includeClientNotes
    ? `CASE WHEN b.status IN ('visited','no_show') THEN NULL ELSE b.note END AS client_note,`
    : 'NULL AS client_note,';
  const res = await client.query(
    `SELECT b.id, b.status, to_char(b.date, 'YYYY-MM-DD') AS date, b.slot_id, b.request_data AS reason,
            CASE WHEN b.slot_id IS NULL THEN NULL ELSE s.start_time END AS start_time,
            CASE WHEN b.slot_id IS NULL THEN NULL ELSE s.end_time END AS end_time,
            b.created_at, b.is_staff_booking, b.reschedule_token, ${clientNoteSelect}
            v.note AS staff_note
       FROM bookings b
       LEFT JOIN slots s ON b.slot_id = s.id
       LEFT JOIN client_visits v ON v.client_id = b.user_id AND v.date = b.date
       WHERE ${where}
       ORDER BY b.created_at DESC${limitOffset}`,
    params,
  );
  let rows = res.rows;
  if (includeVisits && (!status || status === 'visited')) {
    const visitWhere = ['c.client_id = ANY($1)'];
    if (past) {
      visitWhere.push('v.date < CURRENT_DATE');
    }
    const visitRes = await client.query(
      `SELECT v.id, 'visited' AS status, to_char(v.date, 'YYYY-MM-DD') AS date, NULL AS slot_id, NULL AS reason, NULL AS start_time, NULL AS end_time, to_char(v.date, 'YYYY-MM-DD') AS created_at, false AS is_staff_booking, NULL AS reschedule_token, v.note AS staff_note
         FROM client_visits v
         INNER JOIN clients c ON c.client_id = v.client_id
         LEFT JOIN bookings b ON b.user_id = c.client_id AND b.date = v.date
         WHERE ${visitWhere.join(' AND ')} AND b.id IS NULL
         ORDER BY v.date DESC`,
      [userIds],
    );
    rows = rows.concat(visitRes.rows);
    rows.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    if (typeof offset === 'number') {
      rows = rows.slice(offset);
    }
    if (typeof limit === 'number') {
      rows = rows.slice(0, limit);
    }
  }
  return rows;
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
       VALUES ($1, $2, $3, NULL, $4, 'shopper', $5) RETURNING client_id`,
      [firstName, lastName, email, clientId, profileLink],
    );
    return res.rows[0].client_id;
  }

