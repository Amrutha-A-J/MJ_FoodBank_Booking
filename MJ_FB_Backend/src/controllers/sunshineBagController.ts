import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';
import { reginaStartOfDayISO, getWeekForDate } from '../utils/dateUtils';
import {
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} from './pantry/pantryAggregationController';

export async function refreshSunshineBagOverall(year: number, month: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const endDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const result = await pool.query(
    `SELECT COALESCE(SUM(weight)::int, 0) AS weight,
            COALESCE(SUM(client_count)::int, 0) AS client_count
       FROM sunshine_bag_log
       WHERE date >= $1 AND date < $2`,
    [startDate, endDate],
  );
  const weight = Number(result.rows[0]?.weight ?? 0);
  const clientCount = Number(result.rows[0]?.client_count ?? 0);
  await pool.query(
    `INSERT INTO sunshine_bag_overall (year, month, weight, client_count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (year, month)
       DO UPDATE SET weight = EXCLUDED.weight,
                     client_count = EXCLUDED.client_count`,
    [year, month, weight, clientCount],
  );
}

export async function getSunshineBag(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: 'Date required' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ message: 'Invalid date' });
    const result = await pool.query(
      'SELECT date, weight, client_count as "clientCount" FROM sunshine_bag_log WHERE date = $1',
      [date],
    );
    if ((result.rowCount ?? 0) === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error retrieving sunshine bag:', err);
    next(err);
  }
}

export async function upsertSunshineBag(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, weight, clientCount } = req.body;
    const result = await pool.query(
      `INSERT INTO sunshine_bag_log (date, weight, client_count)
       VALUES ($1, $2, $3)
       ON CONFLICT (date) DO UPDATE SET weight = EXCLUDED.weight, client_count = EXCLUDED.client_count
       RETURNING date, weight, client_count as "clientCount"`,
      [date, weight, clientCount],
    );
    const dt = new Date(reginaStartOfDayISO(date));
    await refreshSunshineBagOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
    const { week, month, year } = getWeekForDate(date);
    await Promise.all([
      refreshPantryWeekly(year, month, week),
      refreshPantryMonthly(year, month),
      refreshPantryYearly(year),
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Error saving sunshine bag:', err);
    next(err);
  }
}
