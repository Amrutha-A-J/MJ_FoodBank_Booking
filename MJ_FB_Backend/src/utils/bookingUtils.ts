import pool from '../db';
import { Pool, PoolClient } from 'pg';
import { formatReginaDate, reginaStartOfDayISO } from './dateUtils';

export type Queryable = Pool | PoolClient;

export function getMonthRange(date: Date | string): { start: string; end: string } | false {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      start: formatReginaDate(start),
      end: formatReginaDate(end),
    };
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
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

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
  try {
    const formatted = formatReginaDate(targetDate);
    const range = getMonthRange(formatted);
    if (!range) return false;
    const { start, end } = range;

    if (lock) {
      await client.query(
        `SELECT id FROM bookings WHERE user_id=$1 AND date BETWEEN $2 AND $3 FOR UPDATE`,
        [userId, start, end],
      );
      await client.query(
        `SELECT cv.id FROM client_visits cv
        INNER JOIN clients c ON cv.client_id = c.client_id
        WHERE c.id=$1 AND cv.date BETWEEN $2 AND $3 FOR UPDATE`,
        [userId, start, end],
      );
    }

    const res = await client.query(
      `SELECT (
        SELECT COUNT(*) FROM bookings
        WHERE user_id=$1 AND status='approved' AND date BETWEEN $2 AND $3
      ) + (
        SELECT COUNT(*) FROM client_visits cv
        INNER JOIN clients c ON cv.client_id = c.client_id
        WHERE c.id=$1 AND cv.date BETWEEN $2 AND $3
      ) AS total`,
      [userId, start, end],
    );
    return Number(res.rows[0].total);
  } catch {
    return false;
  }
}

export async function findUpcomingBooking(
  userId: number,
): Promise<{ date: string; start_time: string; status: string } | null> {
  const res = await pool.query(
    `SELECT b.date, s.start_time, b.status
       FROM bookings b
       INNER JOIN slots s ON b.slot_id = s.id
       WHERE b.user_id=$1
         AND b.status IN ('submitted','approved')
         AND b.date >= CURRENT_DATE
         AND NOT EXISTS (
           SELECT 1
           FROM client_visits cv
           INNER JOIN clients c ON cv.client_id = c.client_id
           WHERE c.id = b.user_id AND cv.date = b.date
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
