import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

export async function listDonors(req: Request, res: Response, next: NextFunction) {
  try {
    const search = (req.query.search as string) ?? '';
    const result = await pool.query(
      'SELECT id, name FROM donors WHERE name ILIKE $1 ORDER BY name',
      [`%${search}%`],
    );
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

export async function topDonors(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10) || new Date().getFullYear();
    const limit = parseInt((req.query.limit as string) ?? '', 10) || 7;
    const result = await pool.query(
      `SELECT o.name, SUM(d.weight)::int AS "totalKg", MAX(d.date) AS "lastDonationISO"
       FROM donations d JOIN donors o ON d.donor_id = o.id
       WHERE EXTRACT(YEAR FROM d.date) = $1
       GROUP BY o.id, o.name
       ORDER BY "totalKg" DESC
       LIMIT $2`,
      [year, limit],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing top donors:', error);
    next(error);
  }
}
