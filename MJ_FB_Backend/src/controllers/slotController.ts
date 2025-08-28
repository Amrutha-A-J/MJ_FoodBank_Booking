import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { Slot } from '../models/slot';
import logger from '../utils/logger';
import { formatReginaDate, reginaStartOfDayISO } from '../utils/dateUtils';
import { slotSchema, slotIdParamSchema } from '../schemas/slotSchemas';

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

async function getSlotsForDate(
  date: string,
  includePast = false,
): Promise<Slot[]> {
  const reginaDate = formatReginaDate(date);
  const dateObj = new Date(reginaStartOfDayISO(reginaDate));
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date');
  }
  const day = dateObj.getDay(); // Sunday=0, Monday=1, etc.
  const weekOfMonth = Math.ceil(dateObj.getDate() / 7);

  // Closed on weekends
  if (day === 0 || day === 6) return [];
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
  const { rows } = await pool.query(slotsQuery);
  // Filter again in code to ensure correct behaviour when the DB layer is mocked
  let slots = rows.filter((s: any) => {
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

  if (!includePast && reginaDate === formatReginaDate(new Date())) {
    const nowTime = currentReginaTime();
    slots = slots.filter((s: any) => s.start_time >= nowTime);
  }

  const [
    blockedResult = { rows: [] as any[] },
    recurringBlockedResult = { rows: [] as any[] },
    breakResult = { rows: [] as any[] },
    bookingsResult = { rows: [] as any[] },
  ] = await Promise.all([
    pool.query('SELECT slot_id, reason FROM blocked_slots WHERE date = $1', [
      reginaDate,
    ]),
    pool.query(
      'SELECT slot_id, reason FROM recurring_blocked_slots WHERE day_of_week = $1 AND week_of_month = $2',
      [day, weekOfMonth],
    ),
    pool.query('SELECT slot_id, reason FROM breaks WHERE day_of_week = $1', [
      day,
    ]),
    pool.query(
      `SELECT slot_id, COUNT(*) AS approved_count
         FROM bookings
         WHERE status = 'approved' AND date = $1
         GROUP BY slot_id`,
      [reginaDate],
    ),
  ]);
  const blockedMap = new Map<number, string>(
    [...recurringBlockedResult.rows, ...blockedResult.rows].map(r => [
      Number(r.slot_id),
      r.reason || '',
    ]),
  );
  const breakMap = new Map<number, string>(
    breakResult.rows.map(r => [Number(r.slot_id), r.reason || '']),
  );

  const approvedMap: Record<string, number> = {};
  for (const row of bookingsResult.rows) {
    approvedMap[row.slot_id] = Number(row.approved_count);
  }

  return slots.map((slot: any) => {
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
      : slot.max_capacity - (approvedMap[slot.id] || 0);
    const result: Slot = {
      id: slot.id.toString(),
      startTime: slot.start_time,
      endTime: slot.end_time,
      maxCapacity: slot.max_capacity,
      available,
    };
    if (reason) result.reason = reason;
    if (status) result.status = status as 'blocked' | 'break';
    return result;
  });
}

export async function listSlots(req: Request, res: Response, next: NextFunction) {
  const date = req.query.date as string;
  if (!date) return res.status(400).json({ message: 'Date query parameter required' });

  try {
    const reginaDate = formatReginaDate(date);
    const dateObj = new Date(reginaStartOfDayISO(reginaDate));
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    const includePast = req.query.includePast === 'true';
    const holidayResult = await pool.query(
      'SELECT reason FROM holidays WHERE date = $1',
      [reginaDate],
    );
    if (holidayResult.rows.length > 0) {
      // Closed for a holiday – return an empty slot list rather than an error
      return res.json([]);
    }
    const slotsWithAvailability = await getSlotsForDate(reginaDate, includePast);
    res.json(slotsWithAvailability);
  } catch (error: any) {
    if (error.message === 'Invalid date' || error instanceof RangeError) {
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
  const days = Number(req.query.days) || 7;
  const start = (req.query.start as string) || formatReginaDate(new Date());
  const includePast = req.query.includePast === 'true';

  try {
    const reginaStart = formatReginaDate(start);
    const startDate = new Date(reginaStartOfDayISO(reginaStart));
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start date' });
    }

    const dates = Array.from({ length: days }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return formatReginaDate(d);
    });

    const slotsForDates = await Promise.all(
      dates.map(date => getSlotsForDate(date, includePast)),
    );

    const today = formatReginaDate(new Date());
    const results = dates.map((date, idx) => {
      let slots = slotsForDates[idx];
      if (!includePast && date === today) {
        const nowTime = currentReginaTime();
        slots = slots.filter(s => s.startTime >= nowTime);
      }
      return { date, slots };
    });

    res.json(results);
  } catch (error: any) {
    if (error.message === 'Invalid date' || error instanceof RangeError) {
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
    const result = await pool.query('SELECT * FROM slots ORDER BY start_time');
    const slots = result.rows.map((slot: any) => ({
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
