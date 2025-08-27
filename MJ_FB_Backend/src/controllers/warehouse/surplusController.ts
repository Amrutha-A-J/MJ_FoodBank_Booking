import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import config from '../../config';
import logger from '../../utils/logger';
import { refreshWarehouseOverall } from './warehouseOverallController';

function calculateWeight(type: 'BREAD' | 'CANS', count: number) {
  const multiplier = type === 'BREAD' ? config.breadWeightMultiplier : config.cansWeightMultiplier;
  return count * multiplier;
}

export async function listSurplus(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      'SELECT id, date, type, count, weight FROM surplus_log ORDER BY date DESC, id DESC',
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing surplus:', error);
    next(error);
  }
}

export async function addSurplus(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, type, count } = req.body;
    const weight = calculateWeight(type, count);
    const result = await pool.query(
      'INSERT INTO surplus_log (date, type, count, weight) VALUES ($1, $2, $3, $4) RETURNING id, date, type, count, weight',
      [date, type, count, weight],
    );
    const dt = new Date(date);
    await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error adding surplus:', error);
    next(error);
  }
}

export async function updateSurplus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date, type, count } = req.body;
    const weight = calculateWeight(type, count);
    const existing = await pool.query('SELECT date FROM surplus_log WHERE id = $1', [id]);
    const oldDate = existing.rows[0]?.date as string | undefined;
    const result = await pool.query(
      'UPDATE surplus_log SET date = $1, type = $2, count = $3, weight = $4 WHERE id = $5 RETURNING id, date, type, count, weight',
      [date, type, count, weight, id],
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
    logger.error('Error updating surplus:', error);
    next(error);
  }
}

export async function deleteSurplus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT date FROM surplus_log WHERE id = $1', [id]);
    await pool.query('DELETE FROM surplus_log WHERE id = $1', [id]);
    if (existing.rows[0]) {
      const dt = new Date(existing.rows[0].date);
      await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
    }
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting surplus:', error);
    next(error);
  }
}
