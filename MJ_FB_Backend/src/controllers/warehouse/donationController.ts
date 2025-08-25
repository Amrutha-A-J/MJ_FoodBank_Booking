import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';

export async function listDonations(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: 'Date required' });
    const result = await pool.query(
      `SELECT d.id, d.date, d.weight, d.donor_id as "donorId", o.name as donor
       FROM donations d JOIN donors o ON d.donor_id = o.id
       WHERE d.date = $1 ORDER BY d.id`,
      [date],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing donations:', error);
    next(error);
  }
}

export async function addDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, donorId, weight } = req.body;
    const result = await pool.query(
      'INSERT INTO donations (date, donor_id, weight) VALUES ($1, $2, $3) RETURNING id, date, donor_id as "donorId", weight',
      [date, donorId, weight],
    );
    const donorRes = await pool.query('SELECT name FROM donors WHERE id = $1', [donorId]);
    res.status(201).json({ ...result.rows[0], donor: donorRes.rows[0].name });
  } catch (error) {
    logger.error('Error adding donation:', error);
    next(error);
  }
}

export async function updateDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date, donorId, weight } = req.body;
    const result = await pool.query(
      'UPDATE donations SET date = $1, donor_id = $2, weight = $3 WHERE id = $4 RETURNING id, date, donor_id as "donorId", weight',
      [date, donorId, weight, id],
    );
    const donorRes = await pool.query('SELECT name FROM donors WHERE id = $1', [donorId]);
    res.json({ ...result.rows[0], donor: donorRes.rows[0].name });
  } catch (error) {
    logger.error('Error updating donation:', error);
    next(error);
  }
}

export async function deleteDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM donations WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting donation:', error);
    next(error);
  }
}

export async function donorAggregations(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10) || new Date().getFullYear();
    const result = await pool.query(
      `SELECT o.name AS donor, m.month, COALESCE(SUM(d.weight)::int, 0) AS total
       FROM donors o
       CROSS JOIN generate_series(1, 12) AS m(month)
       LEFT JOIN donations d ON d.donor_id = o.id
         AND EXTRACT(YEAR FROM d.date) = $1
         AND EXTRACT(MONTH FROM d.date) = m.month
       GROUP BY o.name, m.month
       ORDER BY o.name, m.month`,
      [year],
    );

    const donorMap = new Map<string, { donor: string; monthlyTotals: number[]; total: number }>();
    for (const { donor, month, total } of result.rows as {
      donor: string;
      month: number;
      total: number;
    }[]) {
      if (!donorMap.has(donor)) {
        donorMap.set(donor, { donor, monthlyTotals: Array(12).fill(0), total: 0 });
      }
      const entry = donorMap.get(donor)!;
      entry.monthlyTotals[month - 1] = total ?? 0;
      entry.total += total ?? 0;
    }

    res.json(Array.from(donorMap.values()));
  } catch (error) {
    logger.error('Error listing donor aggregations:', error);
    next(error);
  }
}
