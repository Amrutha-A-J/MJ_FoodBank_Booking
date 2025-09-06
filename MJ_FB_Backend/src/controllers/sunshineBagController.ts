import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

export async function getSunshineBag(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: 'Date required' });
    const result = await pool.query(
      'SELECT date, weight FROM sunshine_bag_log WHERE date = $1',
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
    const { date, weight } = req.body;
    const result = await pool.query(
      `INSERT INTO sunshine_bag_log (date, weight)
       VALUES ($1, $2)
       ON CONFLICT (date) DO UPDATE SET weight = EXCLUDED.weight
       RETURNING date, weight`,
      [date, weight],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Error saving sunshine bag:', err);
    next(err);
  }
}
