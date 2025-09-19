import { Request, Response } from 'express';
import pool from '../../db';
import { getWarehouseSettings } from '../../utils/warehouseSettings';
import asyncHandler from '../../middleware/asyncHandler';
import {
  refreshWarehouseForDate,
  refreshWarehouseForDateChange,
} from '../../utils/warehouseRefresh';

async function calculateWeight(type: 'BREAD' | 'CANS', count: number) {
  const { breadWeightMultiplier, cansWeightMultiplier } =
    await getWarehouseSettings();
  const multiplier =
    type === 'BREAD' ? breadWeightMultiplier : cansWeightMultiplier;
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
  await refreshWarehouseForDate(date);
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
  await refreshWarehouseForDateChange(date, oldDate);
  res.json(result.rows[0]);
});

export const deleteSurplus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT date FROM surplus_log WHERE id = $1', [id]);
  await pool.query('DELETE FROM surplus_log WHERE id = $1', [id]);
  if (existing.rows[0]) {
    await refreshWarehouseForDate(existing.rows[0].date);
  }
  res.json({ message: 'Deleted' });
});

