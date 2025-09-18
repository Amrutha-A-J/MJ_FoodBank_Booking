import pool from '../db';
import { Pool, PoolClient } from 'pg';
import { formatReginaDate } from '../utils/dateUtils';
import { hasTable } from '../utils/dbUtils';
import logger from '../utils/logger';

export type Queryable = Pool | PoolClient;

export interface BookingRow {
  id: number;
  user_id: number | null;
  new_client_id: number | null;
  slot_id: number;
  status: string;
  request_data: string | null;
  note: string | null;
  date: string;
  is_staff_booking: boolean;
  reschedule_token: string;
}

export class SlotCapacityError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export class ClientNotFoundError extends Error {
  status: number;
  constructor(message = 'Client not found', status = 404) {
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
  const params = [slotId, reginaDate];
  const baseQuery = `SELECT s.max_capacity, b.approved_count
       FROM slots s
       LEFT JOIN (
         SELECT slot_id, COUNT(id) AS approved_count
         FROM bookings
         WHERE slot_id = $1 AND date = $2 AND status = 'approved'
         GROUP BY slot_id
       ) b ON b.slot_id = s.id
       WHERE s.id = $1`;
  const lockQuery = `${baseQuery} FOR UPDATE`;
  let res;
  let useSavepoint = true;
  try {
    await (client as any).query('SAVEPOINT check_slot_capacity');
  } catch {
    useSavepoint = false;
  }
  try {
    res = await client.query(lockQuery, params);
    if (useSavepoint) {
      await (client as any).query('RELEASE SAVEPOINT check_slot_capacity');
    }
  } catch (err: any) {
    if (useSavepoint) {
      try {
        await (client as any).query('ROLLBACK TO SAVEPOINT check_slot_capacity');
      } catch {}
    }
    if (err.code === '0A000') {
      res = await client.query(baseQuery, params);
      if (useSavepoint) {
        try {
          await (client as any).query('RELEASE SAVEPOINT check_slot_capacity');
        } catch {}
      }
    } else if (err.code === '25P02') {
      if (useSavepoint) {
        try {
          await (client as any).query('RELEASE SAVEPOINT check_slot_capacity');
        } catch {}
      }
      throw new SlotCapacityError('Transaction aborted, please retry', 503);
    } else {
      if (useSavepoint) {
        try {
          await (client as any).query('RELEASE SAVEPOINT check_slot_capacity');
        } catch {}
      }
      throw err;
    }
  }
  if ((res.rowCount ?? 0) === 0) {
    throw new SlotCapacityError('Invalid slot');
  }
  const approvedCount = Number(res.rows[0].approved_count);
  if (approvedCount >= res.rows[0].max_capacity) {
    throw new SlotCapacityError('Slot full on selected date', 409);
  }
}

export async function lockClientRow(
  userId: number,
  client: Queryable = pool,
) {
  let useSavepoint = true;
  let queryResult;
  try {
    await (client as any).query('SAVEPOINT lock_client_row');
  } catch {
    useSavepoint = false;
  }
  try {
    queryResult = await client.query(
      'SELECT client_id FROM clients WHERE client_id=$1 FOR UPDATE',
      [userId],
    );
    if (useSavepoint) {
      await (client as any).query('RELEASE SAVEPOINT lock_client_row');
    }
  } catch (err: any) {
    if (useSavepoint) {
      try {
        await (client as any).query('ROLLBACK TO SAVEPOINT lock_client_row');
        await (client as any).query('RELEASE SAVEPOINT lock_client_row');
      } catch {
        // ignore rollback errors
      }
    }
    if (err.code === '0A000') {
      queryResult = await client.query('SELECT client_id FROM clients WHERE client_id=$1', [
        userId,
      ]);
      if (useSavepoint) {
        try {
          await (client as any).query('RELEASE SAVEPOINT lock_client_row');
        } catch {}
      }
    } else {
      logger.error(`Failed to lock client row for user ${userId}`, err);
      throw err;
    }
  }
  if (!queryResult || queryResult.rowCount === 0) {
    throw new ClientNotFoundError(`Client ${userId} not found`);
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
): Promise<number> {
  const reginaDate = formatReginaDate(date);
  const res = await client.query<{ id: number }>(
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
  const res = await client.query<BookingRow>(
    `SELECT id, user_id, new_client_id, slot_id, status, request_data, note, date, is_staff_booking, reschedule_token
     FROM bookings WHERE id = $1`,
    [id],
  );
  return res.rows[0];
}

export async function fetchBookingByToken(
  token: string,
  client: Queryable = pool,
  forUpdate = false,
) {
  const res = await client.query<BookingRow>(
    `SELECT id, user_id, new_client_id, slot_id, status, request_data, note, date, is_staff_booking, reschedule_token
       FROM bookings WHERE reschedule_token = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [token],
  );
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
  const params = [
    id,
    ...keys.map((k) => (k === 'date' ? formatReginaDate(fields[k]) : fields[k])),
  ];
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
        LEFT JOIN monthly_client_visits v ON v.client_id = u.client_id
          AND DATE_TRUNC('month', b.date) = v.month
        LEFT JOIN monthly_approved_bookings ab ON ab.client_id = u.client_id
          AND DATE_TRUNC('month', b.date) = ab.month
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
  const hasNewClients = await hasTable('new_clients', client);
  const emailField = hasNewClients
    ? 'COALESCE(u.email, nc.email)'
    : 'u.email';
  const newClientJoin = hasNewClients
    ? 'LEFT JOIN new_clients nc ON b.new_client_id = nc.id'
    : '';
  const userPrefJoin = hasNewClients
    ? "LEFT JOIN user_preferences up ON (up.user_id = b.user_id AND up.user_type = 'client') OR (up.user_id = b.new_client_id AND up.user_type = 'new_client')"
    : "LEFT JOIN user_preferences up ON up.user_id = b.user_id AND up.user_type = 'client'";
  const res = await client.query(
    `SELECT
        b.id,
        b.user_id,
        ${emailField} as user_email,
        s.start_time,
        s.end_time,
        b.reschedule_token
       FROM bookings b
       LEFT JOIN clients u ON b.user_id = u.client_id
       ${newClientJoin}
       ${userPrefJoin}
       INNER JOIN slots s ON b.slot_id = s.id
       WHERE b.status = 'approved' AND b.date = $1 AND b.reminder_sent = false AND COALESCE(up.email_reminders, true)`,
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
       LEFT JOIN client_visits v ON v.client_id = b.user_id AND v.date = b.date AND v.is_anonymous = false
       WHERE ${where}
       ORDER BY (b.status='approved' AND b.date >= CURRENT_DATE) DESC, b.date DESC${limitOffset}`,
    params,
  );
  let rows = res.rows;
  if (includeVisits && (!status || status === 'visited')) {
    const visitWhere = ['c.client_id = ANY($1)', 'v.is_anonymous = false'];
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
    const today = new Date().toISOString().slice(0, 10);
    rows.sort((a: any, b: any) => {
      const aUpcoming = a.status === 'approved' && a.date >= today;
      const bUpcoming = b.status === 'approved' && b.date >= today;
      if (aUpcoming !== bUpcoming) {
        return aUpcoming ? -1 : 1;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
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
      `INSERT INTO clients (first_name, last_name, email, phone, client_id, role, profile_link, consent)
       VALUES ($1, $2, $3, NULL, $4, 'shopper', $5, true) RETURNING client_id`,
      [firstName, lastName, email, clientId, profileLink],
    );
    return res.rows[0].client_id;
  }

