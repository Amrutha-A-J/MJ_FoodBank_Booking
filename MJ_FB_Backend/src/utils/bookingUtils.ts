import pool from '../db';
import { Pool, PoolClient } from 'pg';
import { formatReginaDate, reginaStartOfDayISO } from './dateUtils';
import logger from './logger';

export type Queryable = Pool | PoolClient;

export function getMonthRange(date: Date | string): { start: string; end: string } | false {
  try {
    const reginaStr = formatReginaDate(date);
    const [yearStr, monthStr] = reginaStr.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr); // 1-based month

    const start = `${yearStr}-${monthStr}-01`;
    const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const end = `${yearStr}-${monthStr}-${String(endDay).padStart(2, '0')}`;

    return { start, end };
  } catch {
    return false;
  }
}

export function isDateWithinCurrentOrNextMonth(dateStr: string): boolean {
  try {
    const today = new Date(reginaStartOfDayISO(new Date()));
    const bookingDate = new Date(reginaStartOfDayISO(dateStr));

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysRemaining = lastDayOfMonth.getDate() - today.getDate();
    const inLastWeek = daysRemaining < 7;

    const nextMonth = (currentMonth + 1) % 12;
    const nextMonthYear =
      currentMonth === 11 ? currentYear + 1 : currentYear;

    if (
      bookingDate.getFullYear() === currentYear &&
      bookingDate.getMonth() === currentMonth
    ) {
      return true;
    }

    if (
      inLastWeek &&
      bookingDate.getFullYear() === nextMonthYear &&
      bookingDate.getMonth() === nextMonth
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function countVisitsAndBookingsForMonth(
  userId: number,
  targetDate: string,
  client: Queryable = pool,
  lock = false,
): Promise<number | false> {
  let start: string;
  let end: string;
  try {
    const formatted = formatReginaDate(targetDate);
    const range = getMonthRange(formatted);
    if (!range) return false;
    ({ start, end } = range);
  } catch {
    return false;
  }

  if (lock) {
    try {
      await client.query(
        `SELECT id FROM bookings WHERE user_id=$1 AND date BETWEEN $2 AND $3 FOR UPDATE`,
        [userId, start, end],
      );
      await client.query(
        `SELECT cv.id FROM client_visits cv
        INNER JOIN clients c ON cv.client_id = c.client_id
        WHERE c.client_id=$1 AND cv.date BETWEEN $2 AND $3 FOR UPDATE`,
        [userId, start, end],
      );
    } catch (err) {
      logger.error(
        `Failed to lock visits/bookings for user ${userId} between ${start} and ${end}`,
        err,
      );
      throw err;
    }
  }

  try {
    const res = await client.query(
      `SELECT (
        SELECT COUNT(*) FROM bookings
        WHERE user_id=$1 AND status='approved' AND date BETWEEN $2 AND $3 AND date >= CURRENT_DATE
      ) + (
        SELECT COUNT(*) FROM client_visits cv
        INNER JOIN clients c ON cv.client_id = c.client_id
        WHERE c.client_id=$1 AND cv.date BETWEEN $2 AND $3
      ) AS total`,
      [userId, start, end],
    );
    return Number(res.rows[0].total);
  } catch (err) {
    logger.error(
      `Failed to count visits and bookings for user ${userId} between ${start} and ${end}`,
      err,
    );
    throw err;
  }
}

export async function findUpcomingBooking(
  userId: number,
  client: Queryable = pool,
): Promise<{ date: string; start_time: string; status: string } | null> {
  const res = await client.query(
    `SELECT b.date, s.start_time, b.status
       FROM bookings b
       INNER JOIN slots s ON b.slot_id = s.id
       WHERE b.user_id=$1
        AND b.status = 'approved'
         AND b.date >= CURRENT_DATE
         AND NOT EXISTS (
           SELECT 1
           FROM client_visits cv
           INNER JOIN clients c ON cv.client_id = c.client_id
           WHERE c.client_id = b.user_id AND cv.date = b.date
         )
       ORDER BY b.date ASC
       LIMIT 1`,
    [userId],
  );
  // `rowCount` can be null in the PG typings, so fall back to 0 when null.
  return (res.rowCount ?? 0) > 0 ? res.rows[0] : null;
}

export const LIMIT_MESSAGE =
  "You’ve already visited the Moose Jaw Food Bank twice this month. Please return at the end of the month to book your appointment for next month. You can only book for next month during the last week of this month.";

export interface SimpleSlot {
  startTime: string;
  endTime: string;
}

const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function splitSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number,
): SimpleSlot[] {
  if (
    !TIME_REGEX.test(startTime) ||
    !TIME_REGEX.test(endTime) ||
    intervalMinutes <= 0
  ) {
    throw new Error('Invalid parameters');
  }

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (end <= start) throw new Error('Invalid time range');
  if ((end - start) % intervalMinutes !== 0) {
    throw new Error('Range not divisible by interval');
  }

  const slots: SimpleSlot[] = [];
  for (let m = start; m < end; m += intervalMinutes) {
    const slotEnd = m + intervalMinutes;
    slots.push({ startTime: minutesToTime(m), endTime: minutesToTime(slotEnd) });
  }
  return slots;
}

export function combineSlots(slots: SimpleSlot[]): SimpleSlot[] {
  if (slots.length === 0) return [];

  const sorted = [...slots].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
  );

  for (const s of sorted) {
    if (
      !TIME_REGEX.test(s.startTime) ||
      !TIME_REGEX.test(s.endTime) ||
      toMinutes(s.endTime) <= toMinutes(s.startTime)
    ) {
      throw new Error('Invalid slot');
    }
  }

  const combined: SimpleSlot[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (toMinutes(current.endTime) === toMinutes(next.startTime)) {
      current.endTime = next.endTime;
    } else {
      combined.push(current);
      current = { ...next };
    }
  }
  combined.push(current);
  return combined;
}

export function getSlotDates(start: string | Date, end: string | Date): string[] {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (
    isNaN(startDate.getTime()) ||
    isNaN(endDate.getTime()) ||
    startDate > endDate
  ) {
    throw new Error('Invalid date range');
  }

  const current = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    ),
  );
  const last = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
  );

  const dates: string[] = [];
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}
