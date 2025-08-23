import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

export async function listPigPounds(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      'SELECT id, date, weight FROM pig_pound_log ORDER BY date DESC, id DESC',
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
    const result = await pool.query(
      'UPDATE pig_pound_log SET date = $1, weight = $2 WHERE id = $3 RETURNING id, date, weight',
      [date, weight, id],
    );
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating pig pound donation:', error);
    next(error);
  }
}

export async function deletePigPound(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM pig_pound_log WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting pig pound donation:', error);
    next(error);
  }
}
