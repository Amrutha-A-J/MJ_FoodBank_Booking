import { Request, Response } from 'express';
import pool from '../../db';
import { refreshWarehouseOverall } from './warehouseOverallController';
import { reginaStartOfDayISO } from '../../utils/dateUtils';
import { getWarehouseSettings } from '../../utils/warehouseSettings';
import asyncHandler from '../../middleware/asyncHandler';

async function calculateWeight(type: 'BREAD' | 'CANS', count: number) {
  const { breadWeightMultiplier, cansWeightMultiplier } = await getWarehouseSettings();
  const multiplier = type === 'BREAD' ? breadWeightMultiplier : cansWeightMultiplier;
  return count * multiplier;
}

export const listSurplus = asyncHandler(async (_req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id, date, type, count, weight FROM surplus_log ORDER BY date DESC, id DESC',
  );
  res.json(result.rows);
});

export const addSurplus = asyncHandler(async (req: Request, res: Response) => {
  const { date, type, count } = req.body;
  const weight = await calculateWeight(type, count);
  const result = await pool.query(
    'INSERT INTO surplus_log (date, type, count, weight) VALUES ($1, $2, $3, $4) RETURNING id, date, type, count, weight',
    [date, type, count, weight],
  );
  const dt = new Date(reginaStartOfDayISO(date));
  await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
  res.status(201).json(result.rows[0]);
});

export const updateSurplus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, type, count } = req.body;
  const weight = await calculateWeight(type, count);
  const existing = await pool.query('SELECT date FROM surplus_log WHERE id = $1', [id]);
  const oldDate = existing.rows[0]?.date as string | undefined;
  const result = await pool.query(
    'UPDATE surplus_log SET date = $1, type = $2, count = $3, weight = $4 WHERE id = $5 RETURNING id, date, type, count, weight',
    [date, type, count, weight, id],
  );
  const newDt = new Date(reginaStartOfDayISO(date));
  await refreshWarehouseOverall(newDt.getUTCFullYear(), newDt.getUTCMonth() + 1);
  if (oldDate) {
    const oldDt = new Date(reginaStartOfDayISO(oldDate));
    if (
      oldDt.getUTCFullYear() !== newDt.getUTCFullYear() ||
      oldDt.getUTCMonth() !== newDt.getUTCMonth()
    ) {
      await refreshWarehouseOverall(oldDt.getUTCFullYear(), oldDt.getUTCMonth() + 1);
    }
  }
  res.json(result.rows[0]);
});

export const deleteSurplus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT date FROM surplus_log WHERE id = $1', [id]);
  await pool.query('DELETE FROM surplus_log WHERE id = $1', [id]);
  if (existing.rows[0]) {
    const dt = new Date(reginaStartOfDayISO(existing.rows[0].date));
    await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
  }
  res.json({ message: 'Deleted' });
});

