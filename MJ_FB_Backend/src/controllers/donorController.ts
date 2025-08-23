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

export async function getDonorDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid donor id' });
    }

    const donorResult = await pool.query('SELECT id, name FROM donors WHERE id = $1', [id]);
    if (donorResult.rowCount === 0) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    const donationsResult = await pool.query(
      'SELECT id, date, weight FROM donations WHERE donor_id = $1 ORDER BY date DESC',
      [id],
    );
    const totalResult = await pool.query(
      'SELECT COALESCE(SUM(weight), 0) as total FROM donations WHERE donor_id = $1',
      [id],
    );
    const year = new Date().getFullYear();
    const yearTotalResult = await pool.query(
      'SELECT COALESCE(SUM(weight), 0) as total FROM donations WHERE donor_id = $1 AND EXTRACT(YEAR FROM date) = $2',
      [id, year],
    );

    res.json({
      ...donorResult.rows[0],
      donations: donationsResult.rows,
      totalDonations: parseInt(totalResult.rows[0].total, 10),
      totalDonationsThisYear: parseInt(yearTotalResult.rows[0].total, 10),
    });
  } catch (error) {
    logger.error('Error fetching donor details:', error);
    next(error);
  }
}
