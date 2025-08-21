import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { Slot } from '../models/slot';
import logger from '../utils/logger';
import slotRules from '../config/slotRules.json';

export async function listSlots(req: Request, res: Response, next: NextFunction) {
  const date = req.query.date as string;
  if (!date) return res.status(400).json({ message: 'Date query parameter required' });

  try {
    // Parse date in local Regina timezone safely
    const dateObj = new Date(date + 'T00:00:00-06:00'); // Regina is UTC-6
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    const day = dateObj.getDay(); // Sunday=0, Monday=1, etc.

    // Closed on weekends
    if (day === 0 || day === 6) return res.json([]);

    const slotsResult = await pool.query('SELECT * FROM slots');
    let slots = slotsResult.rows;

    const rule = (slotRules as any)[day] || (slotRules as any).default;
    if (rule) {
      slots = slots.filter(
        s =>
          s.start_time >= rule.startTime &&
          s.start_time <= rule.endTime &&
          !(rule.exclude || []).includes(s.start_time),
      );
    }

    const blockedResult = await pool.query('SELECT slot_id FROM blocked_slots WHERE date = $1', [date]);
    const blockedSet = new Set(blockedResult.rows.map(r => Number(r.slot_id)));
    const breakResult = await pool.query('SELECT slot_id FROM breaks WHERE day_of_week = $1', [day]);
    const breakSet = new Set(breakResult.rows.map(r => Number(r.slot_id)));

    slots = slots.filter(s => !blockedSet.has(s.id) && !breakSet.has(s.id));

    const bookingsResult = await pool.query(
      `SELECT slot_id, COUNT(*) AS approved_count
       FROM bookings
       WHERE status = 'approved' AND date = $1
       GROUP BY slot_id`,
      [date]
    );

    const approvedMap: Record<string, number> = {};
    for (const row of bookingsResult.rows) {
      approvedMap[row.slot_id] = Number(row.approved_count);
    }

    const slotsWithAvailability: Slot[] = slots.map((slot: any) => ({
      id: slot.id.toString(),
      startTime: slot.start_time,
      endTime: slot.end_time,
      maxCapacity: slot.max_capacity,
      available: slot.max_capacity - (approvedMap[slot.id] || 0),
    }));

    res.json(slotsWithAvailability);
  } catch (error) {
    logger.error('Error listing slots:', error);
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
