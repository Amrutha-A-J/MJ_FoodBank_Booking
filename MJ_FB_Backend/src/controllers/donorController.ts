import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

export async function listDonors(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query('SELECT id, name FROM donors ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing donors:', error);
    next(error);
  }
}

export async function addDonor(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body;
    const result = await pool.query('INSERT INTO donors (name) VALUES ($1) RETURNING id, name', [name]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Donor already exists' });
    }
    logger.error('Error adding donor:', error);
    next(error);
  }
}
