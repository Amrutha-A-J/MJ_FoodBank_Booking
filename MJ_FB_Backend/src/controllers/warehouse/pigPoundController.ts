import { Request, Response } from 'express';
import pool from '../../db';
import { refreshWarehouseOverall } from './warehouseOverallController';
import { reginaStartOfDayISO } from '../../utils/dateUtils';
import asyncHandler from '../../middleware/asyncHandler';

export const listPigPounds = asyncHandler(async (req: Request, res: Response) => {
  const date = req.query.date as string;
  if (!date) return res.status(400).json({ message: 'Date required' });
  const result = await pool.query(
    'SELECT id, date, weight FROM pig_pound_log WHERE date = $1 ORDER BY id',
    [date],
  );
  res.json(result.rows);
});

export const addPigPound = asyncHandler(async (req: Request, res: Response) => {
  const { date, weight } = req.body;
  const result = await pool.query(
    'INSERT INTO pig_pound_log (date, weight) VALUES ($1, $2) RETURNING id, date, weight',
    [date, weight],
  );
  const dt = new Date(reginaStartOfDayISO(date));
  await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
  res.status(201).json(result.rows[0]);
});

export const updatePigPound = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, weight } = req.body;
  const existing = await pool.query('SELECT date FROM pig_pound_log WHERE id = $1', [id]);
  const oldDate = existing.rows[0]?.date as string | undefined;
  const result = await pool.query(
    'UPDATE pig_pound_log SET date = $1, weight = $2 WHERE id = $3 RETURNING id, date, weight',
    [date, weight, id],
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

export const deletePigPound = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT date FROM pig_pound_log WHERE id = $1', [id]);
  await pool.query('DELETE FROM pig_pound_log WHERE id = $1', [id]);
  if (existing.rows[0]) {
    const dt = new Date(reginaStartOfDayISO(existing.rows[0].date));
    await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
  }
  res.json({ message: 'Deleted' });
});

