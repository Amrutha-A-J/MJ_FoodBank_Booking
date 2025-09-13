import pool from '../db';
import { Queryable } from './bookingUtils';
import { formatReginaDate } from './dateUtils';
import { hasTable } from './dbUtils';
import logger from './logger';

interface Holiday {
  date: string;
  reason: string;
}

let holidays: Map<string, string> | null = null;

async function loadHolidays(client: Queryable = pool) {
  if (holidays === null) {
    let rows: any[] = [];
    try {
      const exists = await hasTable('holidays', client);
      if (exists) {
        const result = await client.query(
          'SELECT date, reason FROM holidays ORDER BY date',
        );
        rows = result.rows as any[];
      }
    } catch (err) {
      logger.error('Failed to load holidays', err);
      if (client !== pool) {
        throw err;
      }
      // fall back to empty holidays list if the query fails
    }
    holidays = new Map(
      rows.map(r => [formatReginaDate(r.date), r.reason ?? '']),
    );
  }
  return holidays;
}

export async function getHolidays(client: Queryable = pool) {
  if (holidays !== null) {
    return Array.from(holidays.entries()).map(([date, reason]) => ({
      date,
      reason,
    }));
  }
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

export function setHolidays(value: Map<string, string> | Holiday[] | null) {
  if (value === null) {
    holidays = null;
  } else if (Array.isArray(value)) {
    holidays = new Map(value.map(h => [h.date, h.reason]));
  } else {
    holidays = value;
  }
}
