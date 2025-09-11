import pool from '../db';
import { Queryable } from './bookingUtils';
import { formatReginaDate } from './dateUtils';

let holidays: Map<string, string> | null = null;

async function loadHolidays(client: Queryable = pool) {
  if (holidays === null) {
    const result = await client
      .query('SELECT date, reason FROM holidays ORDER BY date')
      .catch(() => ({ rows: [] } as any));
    const rows = (result?.rows ?? []) as any[];
    holidays = new Map(
      rows.map(r => [formatReginaDate(r.date), r.reason ?? '']),
    );
  }
  return holidays;
}

export async function getHolidays(client: Queryable = pool) {
  const map = await loadHolidays(client);
  return Array.from(map.entries()).map(([date, reason]) => ({ date, reason }));
}

export async function refreshHolidays(client: Queryable = pool) {
  holidays = null;
  return getHolidays(client);
}

export async function isHoliday(date: string | Date, client?: Queryable) {
  const map = await loadHolidays(client);
  const key = formatReginaDate(date);
  return map.has(key);
}

export function setHolidays(value: Map<string, string> | null) {
  holidays = value;
}
