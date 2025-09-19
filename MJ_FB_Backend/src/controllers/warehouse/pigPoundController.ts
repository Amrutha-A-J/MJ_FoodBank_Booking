import { Request, Response } from 'express';
import pool from '../../db';
import asyncHandler from '../../middleware/asyncHandler';
import {
  refreshWarehouseForDate,
  refreshWarehouseForDateChange,
} from '../../utils/warehouseRefresh';

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
  await refreshWarehouseForDate(date);
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
  await refreshWarehouseForDateChange(date, oldDate);
  res.json(result.rows[0]);
});

export const deletePigPound = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT date FROM pig_pound_log WHERE id = $1', [id]);
  await pool.query('DELETE FROM pig_pound_log WHERE id = $1', [id]);
  if (existing.rows[0]) {
    await refreshWarehouseForDate(existing.rows[0].date);
  }
  res.json({ message: 'Deleted' });
});

