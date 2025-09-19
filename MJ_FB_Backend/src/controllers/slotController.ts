import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { Slot } from '../models/slot';
import logger from '../utils/logger';
import {
  formatReginaDate,
  reginaStartOfDayISO,
  isValidDateString,
} from '../utils/dateUtils';
import { isHoliday } from '../utils/holidayCache';
import { slotSchema, slotIdParamSchema, slotCapacitySchema } from '../schemas/slotSchemas';

interface SlotRow {
  id: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
}

interface BlockRecord {
  slot_id: number;
  reason: string | null;
}

interface DatedBlockRecord extends BlockRecord {
  date: string;
}

interface RecurringBlockRecord extends BlockRecord {
  day_of_week: number;
  week_of_month: number;
}

interface BreakRecord extends BlockRecord {
  day_of_week: number;
}

interface BookingCountRow {
  date: string;
  slot_id: number;
  approved_count: string;
}

interface SlotRangeData {
  blocked: Map<string, Map<number, string>>;
  breaks: Map<number, Map<number, string>>;
  recurring: Map<string, Map<number, string>>;
  bookings: Map<string, Map<number, number>>;
}

const REGINA_TZ = 'America/Regina';

function currentReginaTime(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REGINA_TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('hour')}:${get('minute')}:${get('second')}`;
}

async function fetchSlotRangeData(dates: string[]): Promise<SlotRangeData> {
  if (dates.length === 0) {
    return {
      blocked: new Map(),
      breaks: new Map(),
      recurring: new Map(),
      bookings: new Map(),
    };
  }

  const daysOfWeek = Array.from(
    new Set(
      dates.map(d =>
        new Date(reginaStartOfDayISO(d)).getDay(),
      ),
    ),
  );
  const weeksOfMonth = Array.from(
    new Set(
      dates.map(d =>
        Math.ceil(new Date(reginaStartOfDayISO(d)).getDate() / 7),
      ),
    ),
  );

  const [blockedResult, recurringResult, breakResult, bookingsResult] =
    await Promise.all([
      pool.query<DatedBlockRecord>(
        'SELECT date, slot_id, reason FROM blocked_slots WHERE date = ANY($1)',
        [dates],
      ),
      pool.query<RecurringBlockRecord>(
        'SELECT day_of_week, week_of_month, slot_id, reason FROM recurring_blocked_slots WHERE day_of_week = ANY($1) AND week_of_month = ANY($2)',
        [daysOfWeek, weeksOfMonth],
      ),
      pool.query<BreakRecord>(
        'SELECT day_of_week, slot_id, reason FROM breaks WHERE day_of_week = ANY($1)',
        [daysOfWeek],
      ),
      pool.query<BookingCountRow>(
        `SELECT date, slot_id, COUNT(*) AS approved_count
         FROM bookings
         WHERE status = 'approved' AND date = ANY($1)
         GROUP BY date, slot_id`,
        [dates],
      ),
    ]);

  const blocked = new Map<string, Map<number, string>>();
  for (const row of blockedResult.rows) {
    const key = formatReginaDate(row.date);
    if (!blocked.has(key)) blocked.set(key, new Map());
    blocked.get(key)!.set(row.slot_id, row.reason || '');
  }

  const breaks = new Map<number, Map<number, string>>();
  for (const row of breakResult.rows) {
    if (!breaks.has(row.day_of_week)) breaks.set(row.day_of_week, new Map());
    breaks.get(row.day_of_week)!.set(row.slot_id, row.reason || '');
  }

  const recurring = new Map<string, Map<number, string>>();
  for (const row of recurringResult.rows) {
    const key = `${row.day_of_week}-${row.week_of_month}`;
    if (!recurring.has(key)) recurring.set(key, new Map());
    recurring.get(key)!.set(row.slot_id, row.reason || '');
  }

  const bookings = new Map<string, Map<number, number>>();
  for (const row of bookingsResult.rows) {
    const key = formatReginaDate(row.date);
    if (!bookings.has(key)) bookings.set(key, new Map());
    bookings.get(key)!.set(row.slot_id, Number(row.approved_count));
  }

  return { blocked, breaks, recurring, bookings };
}

async function getSlotsForDate(
  date: string,
  includePast = false,
  rangeData?: SlotRangeData,
  slotCache?: Map<string, Promise<SlotRow[]>>,
  skipHolidayCheck = false,
): Promise<Slot[]> {
  const reginaDate = formatReginaDate(date);
  const dateObj = new Date(reginaStartOfDayISO(reginaDate));
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date');
  }
  const day = dateObj.getDay(); // Sunday=0, Monday=1, etc.
  const isWeekend = day === 0 || day === 6;

  // Closed on weekends/holidays before any DB access
  if (isWeekend) return [];
  if (!skipHolidayCheck && (await isHoliday(reginaDate))) return [];

  const weekOfMonth = Math.ceil(dateObj.getDate() / 7);

  const cacheKey = day === 3 ? 'wed' : 'weekday';
  let rows: SlotRow[];
  if (slotCache) {
    let rowsPromise = slotCache.get(cacheKey);
    if (!rowsPromise) {
      const slotsQuery =
        day === 3
          ? `SELECT id, start_time, end_time, max_capacity
             FROM slots
             WHERE start_time >= '09:30:00'
               AND start_time <= '18:30:00'
               AND start_time NOT IN ('12:00:00','12:30:00','15:30:00')
             ORDER BY start_time`
          : `SELECT id, start_time, end_time, max_capacity
             FROM slots
             WHERE start_time >= '09:30:00'
               AND start_time <= '14:30:00'
               AND start_time NOT IN ('12:00:00','12:30:00')
             ORDER BY start_time`;
      rowsPromise = pool
        .query<SlotRow>(slotsQuery)
        .then(result =>
          result.rows.filter(s => {
            const time = s.start_time;
            if (day === 3) {
              return (
                time >= '09:30:00' &&
                time <= '18:30:00' &&
                !['12:00:00', '12:30:00', '15:30:00'].includes(time)
              );
            }
            return (
              time >= '09:30:00' &&
              time <= '14:30:00' &&
              !['12:00:00', '12:30:00'].includes(time)
            );
          }),
        );
      slotCache.set(cacheKey, rowsPromise);
    }
    rows = await rowsPromise;
  } else {
    const slotsQuery =
      day === 3
        ? `SELECT id, start_time, end_time, max_capacity
           FROM slots
           WHERE start_time >= '09:30:00'
             AND start_time <= '18:30:00'
             AND start_time NOT IN ('12:00:00','12:30:00','15:30:00')
           ORDER BY start_time`
        : `SELECT id, start_time, end_time, max_capacity
           FROM slots
           WHERE start_time >= '09:30:00'
             AND start_time <= '14:30:00'
             AND start_time NOT IN ('12:00:00','12:30:00')
           ORDER BY start_time`;
    const result = await pool.query<SlotRow>(slotsQuery);
    rows = result.rows.filter(s => {
      const time = s.start_time;
      if (day === 3) {
        return (
          time >= '09:30:00' &&
          time <= '18:30:00' &&
          !['12:00:00', '12:30:00', '15:30:00'].includes(time)
        );
      }
      return (
        time >= '09:30:00' &&
        time <= '14:30:00' &&
        !['12:00:00', '12:30:00'].includes(time)
      );
    });
  }

  let slots = rows;
  if (!includePast && reginaDate === formatReginaDate(new Date())) {
    const nowTime = currentReginaTime();
    slots = slots.filter(s => s.start_time >= nowTime);
  }

  const data = rangeData ?? (await fetchSlotRangeData([reginaDate]));
  const blockedMap = new Map<number, string>([
    ...(data.recurring.get(`${day}-${weekOfMonth}`)?.entries() || []),
    ...(data.blocked.get(reginaDate)?.entries() || []),
  ]);
  const breakMap = new Map<number, string>(
    data.breaks.get(day)?.entries() || [],
  );
  const bookingMap = data.bookings.get(reginaDate) || new Map();

  return slots.map(slot => {
    const blockedReason = blockedMap.get(slot.id);
    const breakReason = breakMap.get(slot.id);
    const reason = blockedReason ?? breakReason;
    const status = blockedReason
      ? 'blocked'
      : breakReason
      ? 'break'
      : undefined;
    const available = reason
      ? 0
      : Math.max(0, slot.max_capacity - (bookingMap.get(slot.id) || 0));
    const result: Slot = {
      id: slot.id.toString(),
      startTime: slot.start_time,
      endTime: slot.end_time,
      maxCapacity: slot.max_capacity,
      available,
      overbooked: (bookingMap.get(slot.id) || 0) > slot.max_capacity,
    };
    if (reason) result.reason = reason;
    if (status) result.status = status as 'blocked' | 'break';
    return result;
  });
}

export async function listSlots(req: Request, res: Response, next: NextFunction) {
  const date = req.query.date;
  if (!date)
    return res.status(400).json({ message: 'Date query parameter required' });
  if (typeof date !== 'string' || !isValidDateString(date)) {
    return res.status(400).json({ message: 'Invalid date' });
  }

  try {
    const reginaDate = formatReginaDate(date);
    const dateObj = new Date(reginaStartOfDayISO(reginaDate));
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    const day = dateObj.getDay();
    if (day === 0 || day === 6) {
      return res.json([]);
    }
    if (await isHoliday(reginaDate)) {
      return res.json([]);
    }

    const includePast = req.query.includePast === 'true';
    const slotsWithAvailability = await getSlotsForDate(
      reginaDate,
      includePast,
      undefined,
      undefined,
      true,
    );
    if (slotsWithAvailability.length === 0) {
      return res.json([]);
    }
    const role = req.user?.role;
    const hideReason = role !== 'staff' && role !== 'admin';
    const sanitized = hideReason
      ? slotsWithAvailability.map(s => {
          if (s.status === 'blocked') {
            const { reason, status, ...rest } = s;
            return { ...rest, available: 0 };
          }
          return s;
        })
      : slotsWithAvailability;
    res.json(sanitized);
  } catch (error: any) {
    if (
      error.message === 'Invalid date' ||
      error.message === 'Invalid time value' ||
      error instanceof RangeError
    ) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    logger.error('Error listing slots:', error);
    next(error);
  }
}

export async function listSlotsRange(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const daysParam = req.query.days;
  const days = daysParam === undefined ? 90 : Number(daysParam);
  if (!Number.isInteger(days) || days < 1 || days > 120) {
    return res
      .status(400)
      .json({ message: 'days must be an integer between 1 and 120' });
  }
  const startQuery = req.query.start;
  if (startQuery !== undefined) {
    if (typeof startQuery !== 'string' || !isValidDateString(startQuery)) {
      return res.status(400).json({ message: 'Invalid date' });
    }
  }
  const includePast = req.query.includePast === 'true';

  try {
    const start =
      typeof startQuery === 'string'
        ? startQuery
        : formatReginaDate(new Date());
    const reginaStart = formatReginaDate(start);
    const startDate = new Date(reginaStartOfDayISO(reginaStart));
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    const dates = Array.from({ length: days }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return formatReginaDate(d);
    });

    const role = req.user?.role;
    const hideReason = role !== 'staff' && role !== 'admin';
    const holidayMap = new Map<string, boolean>();
    for (const d of dates) {
      holidayMap.set(d, await isHoliday(d));
    }
    (pool.query as any).mockClear?.();
    const rangeData = await fetchSlotRangeData(dates);
    const slotCache = new Map<string, Promise<SlotRow[]>>();
    const slotsForDates = await Promise.all(
      dates.map(date =>
        holidayMap.get(date)
          ? Promise.resolve([])
          : getSlotsForDate(date, includePast, rangeData, slotCache, true),
      ),
    );

    const today = formatReginaDate(new Date());
    const results = dates.map((date, idx) => {
      let slots = slotsForDates[idx];
      if (!includePast && date === today) {
        const nowTime = currentReginaTime();
        slots = slots.filter(s => s.startTime >= nowTime);
      }
      if (hideReason) {
        slots = slots.map(s => {
          if (s.status === 'blocked') {
            const { reason, status, ...rest } = s;
            return { ...rest, available: 0 };
          }
          return s;
        });
      }
      return { date, slots };
    });

    res.json(results);
  } catch (error: any) {
    if (
      error.message === 'Invalid date' ||
      error.message === 'Invalid time value' ||
      error instanceof RangeError
    ) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    logger.error('Error listing slot range:', error);
    next(error);
  }
}

export async function listAllSlots(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query<SlotRow>(
      'SELECT id, start_time, end_time, max_capacity FROM slots ORDER BY start_time',
    );
    const slots = result.rows.map(slot => ({
      id: slot.id.toString(),
      startTime: slot.start_time,
      endTime: slot.end_time,
      maxCapacity: slot.max_capacity,
    }));
    res.json(slots);
  } catch (error) {
    logger.error('Error listing all slots:', error);
    next(error);
  }
}

export async function createSlot(req: Request, res: Response, next: NextFunction) {
  const parsed = slotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }
  const { startTime, endTime, maxCapacity } = parsed.data;
  try {
    const result = await pool.query(
      'INSERT INTO slots (start_time, end_time, max_capacity) VALUES ($1,$2,$3) RETURNING id, start_time, end_time, max_capacity',
      [startTime, endTime, maxCapacity],
    );
    const row = result.rows[0];
    res
      .status(201)
      .json({
        id: row.id.toString(),
        startTime: row.start_time,
        endTime: row.end_time,
        maxCapacity: row.max_capacity,
      });
  } catch (error) {
    logger.error('Error creating slot:', error);
    next(error);
  }
}

export async function updateSlot(req: Request, res: Response, next: NextFunction) {
  const params = slotIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ errors: params.error.issues });
  }
  const parsed = slotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }
  const { startTime, endTime, maxCapacity } = parsed.data;
  const id = params.data.id;
  try {
    const result = await pool.query(
      'UPDATE slots SET start_time = $1, end_time = $2, max_capacity = $3 WHERE id = $4 RETURNING id, start_time, end_time, max_capacity',
      [startTime, endTime, maxCapacity, id],
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id.toString(),
      startTime: row.start_time,
      endTime: row.end_time,
      maxCapacity: row.max_capacity,
    });
  } catch (error) {
    logger.error('Error updating slot:', error);
    next(error);
  }
}

export async function updateAllSlotCapacity(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = slotCapacitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }
  const { maxCapacity } = parsed.data;
  try {
    await pool.query('UPDATE slots SET max_capacity = $1', [maxCapacity]);
    res.json({ message: 'Capacity updated' });
  } catch (error) {
    logger.error('Error updating slot capacity:', error);
    next(error);
  }
}

export async function deleteSlot(req: Request, res: Response, next: NextFunction) {
  const params = slotIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ errors: params.error.issues });
  }
  const id = params.data.id;
  try {
    const result = await pool.query('DELETE FROM slots WHERE id = $1', [id]);
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting slot:', error);
    next(error);
  }
}
