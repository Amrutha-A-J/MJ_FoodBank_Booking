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

  // Closed on weekends
  if (day === 0 || day === 6) return [];

  const slotsResult = await pool.query('SELECT * FROM slots');
  let slots = slotsResult.rows;

  if (day !== 3) {
    // Weekdays except Wednesday: exclude 12:00, 12:30 slots, show from 9:30 to 14:30
    slots = slots.filter(
      s =>
        s.start_time >= '09:30:00' &&
        s.start_time <= '14:30:00' &&
        s.start_time !== '12:00:00' &&
        s.start_time !== '12:30:00',
    );
  } else {
    // Wednesday: exclude 12:00, 12:30, 15:30 slots, show from 9:30 to 18:30
    slots = slots.filter(
      s =>
        s.start_time >= '09:30:00' &&
        s.start_time <= '18:30:00' &&
        s.start_time !== '12:00:00' &&
        s.start_time !== '12:30:00' &&
        s.start_time !== '15:30:00',
    );
  }

  const blockedResult = await pool.query(
    'SELECT slot_id, reason FROM blocked_slots WHERE date = $1',
    [reginaDate],
  );
  const blockedMap = new Map<number, string>(
    blockedResult.rows.map(r => [Number(r.slot_id), r.reason || '']),
  );
  const breakResult = await pool.query(
    'SELECT slot_id, reason FROM breaks WHERE day_of_week = $1',
    [day],
  );
  const breakMap = new Map<number, string>(
    breakResult.rows.map(r => [Number(r.slot_id), r.reason || '']),
  );

  const bookingsResult = await pool.query(
    `SELECT slot_id, COUNT(*) AS approved_count
       FROM bookings
       WHERE status = 'approved' AND date = $1
       GROUP BY slot_id`,
    [reginaDate],
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
    const day = dateObj.getDay();
    if (day === 0 || day === 6) {
      return res
        .status(400)
        .json({ message: 'Moose Jaw Food Bank is closed on weekends' });
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

    const results: { date: string; slots: Slot[] }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = formatReginaDate(d);
      const slots = await getSlotsForDate(dateStr);
      results.push({ date: dateStr, slots });
    }

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
