import pool from '../db';

export function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const format = (d: Date) => d.toLocaleDateString('en-CA');
  return {
    start: format(start),
    end: format(end),
  };
}

export function isDateWithinCurrentOrNextMonth(dateStr: string): boolean {
  const today = new Date();
  const bookingDate = new Date(dateStr);

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
}

export async function countApprovedBookingsForMonth(
  userId: number,
  dateStr: string,
): Promise<number> {
  const date = new Date(dateStr);
  const { start, end } = getMonthRange(date);
  const res = await pool.query(
    `SELECT COUNT(*) FROM bookings WHERE user_id=$1 AND status='approved' AND date BETWEEN $2 AND $3`,
    [userId, start, end],
  );
  return Number(res.rows[0].count);
}

export async function updateBookingsThisMonth(userId: number): Promise<number> {
  const now = new Date();
  const { start, end } = getMonthRange(now);
  const res = await pool.query(
    `SELECT COUNT(*) FROM bookings WHERE user_id=$1 AND status='approved' AND date BETWEEN $2 AND $3`,
    [userId, start, end],
  );
  const count = Number(res.rows[0].count);
  await pool.query(
    `UPDATE users SET bookings_this_month=$1, booking_count_last_updated=NOW() WHERE id=$2`,
    [count, userId],
  );
  return count;
}

export async function findUpcomingBooking(
  userId: number,
): Promise<{ date: string; start_time: string; status: string } | null> {
  const res = await pool.query(
    `SELECT b.date, s.start_time, b.status
       FROM bookings b
       INNER JOIN slots s ON b.slot_id = s.id
       WHERE b.user_id=$1 AND b.status IN ('submitted','approved') AND b.date >= CURRENT_DATE
       ORDER BY b.date ASC
       LIMIT 1`,
    [userId],
  );
  // `rowCount` can be null in the PG typings, so fall back to 0 when null.
  return (res.rowCount ?? 0) > 0 ? res.rows[0] : null;
}

export const LIMIT_MESSAGE =
  "You’ve already visited the Moose Jaw Food Bank twice this month. Please return at the end of the month to book your appointment for next month. You can only book for next month during the last week of this month.";
