import { Request, Response } from 'express';
import pool from '../db';
import { reginaStartOfDayISO } from '../utils/dateUtils';
import { parsePaginationParams } from '../utils/parsePaginationParams';
import asyncHandler from '../middleware/asyncHandler';

export const listDonors = asyncHandler(async (req: Request, res: Response) => {
  const search = (req.query.search as string) ?? '';
  const result = await pool.query(
    'SELECT id, name FROM donors WHERE name ILIKE $1 ORDER BY name',
    [`%${search}%`],
  );
  res.json(result.rows);
});

export const addDonor = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO donors (name) VALUES ($1) RETURNING id, name',
      [name],
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Donor already exists' });
    }
    throw error;
  }
});

export const topDonors = asyncHandler(async (req: Request, res: Response) => {
  const year =
    parseInt((req.query.year as string) ?? '', 10) ||
    new Date(reginaStartOfDayISO(new Date())).getUTCFullYear();

  let limit: number;
  try {
    ({ limit } = parsePaginationParams(req, 7, 100));
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message });
  }

  const result = await pool.query(
    `SELECT o.name, SUM(d.weight)::int AS "totalLbs", TO_CHAR(MAX(d.date), 'YYYY-MM-DD') AS "lastDonationISO"
       FROM donations d JOIN donors o ON d.donor_id = o.id
       WHERE EXTRACT(YEAR FROM d.date) = $1
       GROUP BY o.id, o.name
       ORDER BY "totalLbs" DESC, MAX(d.date) DESC
       LIMIT $2`,
    [year, limit],
  );
  res.json(result.rows);
});

export const getDonor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT d.id, d.name,
            COALESCE(SUM(n.weight), 0)::int AS "totalLbs",
            TO_CHAR(MAX(n.date), 'YYYY-MM-DD') AS "lastDonationISO"
       FROM donors d
       LEFT JOIN donations n ON n.donor_id = d.id
       WHERE d.id = $1
       GROUP BY d.id, d.name`,
    [id],
  );
  if ((result.rowCount ?? 0) === 0)
    return res.status(404).json({ message: 'Donor not found' });
  res.json(result.rows[0]);
});

export const donorDonations = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT id, date, weight FROM donations WHERE donor_id = $1 ORDER BY date DESC, id DESC',
    [id],
  );
  res.json(result.rows);
});

