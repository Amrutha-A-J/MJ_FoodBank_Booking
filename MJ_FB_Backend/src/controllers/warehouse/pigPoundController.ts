import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';
import { refreshWarehouseOverall } from './warehouseOverallController';

export async function listPigPounds(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: 'Date required' });
    const result = await pool.query(
      'SELECT id, date, weight FROM pig_pound_log WHERE date = $1 ORDER BY id',
      [date],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing pig pound donations:', error);
    next(error);
  }
}

export async function addPigPound(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, weight } = req.body;
    const result = await pool.query(
      'INSERT INTO pig_pound_log (date, weight) VALUES ($1, $2) RETURNING id, date, weight',
      [date, weight],
    );
    const dt = new Date(date);
    await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error adding pig pound donation:', error);
    next(error);
  }
}

export async function updatePigPound(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date, weight } = req.body;
    const existing = await pool.query('SELECT date FROM pig_pound_log WHERE id = $1', [id]);
    const oldDate = existing.rows[0]?.date as string | undefined;
    const result = await pool.query(
      'UPDATE pig_pound_log SET date = $1, weight = $2 WHERE id = $3 RETURNING id, date, weight',
      [date, weight, id],
    );
    const newDt = new Date(date);
    await refreshWarehouseOverall(newDt.getUTCFullYear(), newDt.getUTCMonth() + 1);
    if (oldDate) {
      const oldDt = new Date(oldDate);
      if (
        oldDt.getUTCFullYear() !== newDt.getUTCFullYear() ||
        oldDt.getUTCMonth() !== newDt.getUTCMonth()
      ) {
        await refreshWarehouseOverall(oldDt.getUTCFullYear(), oldDt.getUTCMonth() + 1);
      }
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating pig pound donation:', error);
    next(error);
  }
}

export async function deletePigPound(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT date FROM pig_pound_log WHERE id = $1', [id]);
    await pool.query('DELETE FROM pig_pound_log WHERE id = $1', [id]);
    if (existing.rows[0]) {
      const dt = new Date(existing.rows[0].date);
      await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
    }
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting pig pound donation:', error);
    next(error);
  }
}
