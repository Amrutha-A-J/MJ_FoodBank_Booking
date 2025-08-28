import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { Slot } from '../models/slot';
import logger from '../utils/logger';
import { formatReginaDate, reginaStartOfDayISO } from '../utils/dateUtils';

async function getSlotsForDate(date: string): Promise<Slot[]> {
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
  const { rows: slots } = await pool.query(slotsQuery);

  const [blockedResult, recurringBlockedResult, breakResult, bookingsResult] =
    await Promise.all([
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
    const holidayResult = await pool.query(
      'SELECT reason FROM holidays WHERE date = $1',
      [reginaDate],
    );
    if (holidayResult.rows.length > 0) {
      const reason = holidayResult.rows[0].reason || 'Holiday';
      return res
        .status(400)
        .json({ message: `Moose Jaw Food Bank is closed: ${reason}` });
    }
    const slotsWithAvailability = await getSlotsForDate(reginaDate);
    res.json(slotsWithAvailability);
  } catch (error: any) {
    if (error.message === 'Invalid date') {
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
      dates.map(date => getSlotsForDate(date)),
    );

    const results = dates.map((date, idx) => ({
      date,
      slots: slotsForDates[idx],
    }));

    res.json(results);
  } catch (error: any) {
    if (error.message === 'Invalid date') {
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
