import { Request, Response } from 'express';
import pool from '../db';
import { reginaStartOfDayISO } from '../utils/dateUtils';
import { parsePaginationParams } from '../utils/parsePaginationParams';
import asyncHandler from '../middleware/asyncHandler';
import { refreshWarehouseOverall } from './warehouse/warehouseOverallController';

export const listDonors = asyncHandler(async (req: Request, res: Response) => {
  const search = (req.query.search as string) ?? '';
  const result = await pool.query(
    `SELECT id, name, email, phone, is_pet_food AS "isPetFood"
       FROM donors
       WHERE CAST(id AS TEXT) ILIKE $1
          OR name ILIKE $1
          OR email ILIKE $1
       ORDER BY name`,
    [`%${search}%`],
  );
  const dedupedRows = Array.from(
    result.rows
      .reduce((map, row) => {
        if (!map.has(row.id)) {
          map.set(row.id, row);
        }
        return map;
      }, new Map<number, (typeof result.rows)[number]>())
      .values(),
  );
  res.json(dedupedRows);
});

export const addDonor = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, isPetFood = false } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO donors (name, email, phone, is_pet_food) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, is_pet_food AS "isPetFood"',
      [name, email ?? null, phone ?? null, isPetFood],
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Donor already exists' });
    }
    throw error;
  }
});

export const updateDonor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, isPetFood = false } = req.body;
  try {
    const existingResult = await pool.query(
      'SELECT is_pet_food AS "isPetFood" FROM donors WHERE id = $1',
      [id],
    );
    if ((existingResult.rowCount ?? 0) === 0)
      return res.status(404).json({ message: 'Donor not found' });
    const previousIsPetFood = Boolean(existingResult.rows[0]?.isPetFood);

    const result = await pool.query(
      'UPDATE donors SET name = $2, email = $3, phone = $4, is_pet_food = $5 WHERE id = $1 RETURNING id, name, email, phone, is_pet_food AS "isPetFood"',
      [id, name, email ?? null, phone ?? null, isPetFood],
    );
    if ((result.rowCount ?? 0) === 0)
      return res.status(404).json({ message: 'Donor not found' });

    if (previousIsPetFood !== Boolean(isPetFood)) {
      const donationMonthsResult = await pool.query(
        `SELECT DATE_TRUNC('month', date) AS "monthStart"
           FROM donations
           WHERE donor_id = $1
           GROUP BY 1`,
        [id],
      );

      const donationMonths = donationMonthsResult.rows as { monthStart: string | Date }[];
      for (const { monthStart } of donationMonths) {
        const monthDate = new Date(monthStart);
        if (Number.isNaN(monthDate.valueOf())) {
          continue;
        }
        const year = monthDate.getUTCFullYear();
        const month = monthDate.getUTCMonth() + 1;
        await refreshWarehouseOverall(year, month);
      }
    }

    res.json(result.rows[0]);
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

  const startDate = new Date(Date.UTC(year, 0, 1)).toISOString().slice(0, 10);
  const endDate = new Date(Date.UTC(year + 1, 0, 1)).toISOString().slice(0, 10);

  const result = await pool.query(
    `SELECT o.name AS name, SUM(d.weight)::int AS "totalLbs", TO_CHAR(MAX(d.date), 'YYYY-MM-DD') AS "lastDonationISO"
       FROM donations d JOIN donors o ON d.donor_id = o.id
       WHERE d.date >= $1 AND d.date < $2
       GROUP BY o.id, o.name
       ORDER BY "totalLbs" DESC, MAX(d.date) DESC
       LIMIT $3`,
    [startDate, endDate, limit],
  );
  res.json(result.rows);
});

export const getDonor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT d.id, d.name, d.email, d.phone, d.is_pet_food AS "isPetFood",
            COALESCE(SUM(n.weight), 0)::int AS "totalLbs",
            TO_CHAR(MAX(n.date), 'YYYY-MM-DD') AS "lastDonationISO"
       FROM donors d
       LEFT JOIN donations n ON n.donor_id = d.id
       WHERE d.id = $1
       GROUP BY d.id, d.name, d.email, d.phone, d.is_pet_food`,
    [id],
  );
  if ((result.rowCount ?? 0) === 0)
    return res.status(404).json({ message: 'Donor not found' });
  res.json(result.rows[0]);
});

export const donorDonations = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT n.id, n.date, n.weight
       FROM donations n
       JOIN donors d ON n.donor_id = d.id
       WHERE d.id = $1
       ORDER BY n.date DESC, n.id DESC`,
    [id],
  );
  res.json(result.rows);
});

