import { Request, Response } from 'express';
import pool from '../db';
import { reginaStartOfDayISO } from '../utils/dateUtils';
import { parsePaginationParams } from '../utils/parsePaginationParams';
import asyncHandler from '../middleware/asyncHandler';

export const listDonors = asyncHandler(async (req: Request, res: Response) => {
  const search = (req.query.search as string) ?? '';
  const result = await pool.query(
    `SELECT id, first_name AS "firstName", last_name AS "lastName", email
       FROM donors
       WHERE CAST(id AS TEXT) ILIKE $1
          OR first_name ILIKE $1
          OR last_name ILIKE $1
          OR email ILIKE $1
       ORDER BY first_name, last_name`,
    [`%${search}%`],
  );
  res.json(result.rows);
});

export const addDonor = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO donors (first_name, last_name, email) VALUES ($1, $2, $3) RETURNING id, first_name AS "firstName", last_name AS "lastName", email',
      [firstName, lastName, email],
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
    `SELECT o.first_name || ' ' || o.last_name AS name, SUM(d.weight)::int AS "totalLbs", TO_CHAR(MAX(d.date), 'YYYY-MM-DD') AS "lastDonationISO"
       FROM donations d JOIN donors o ON d.donor_email = o.email
       WHERE EXTRACT(YEAR FROM d.date) = $1
       GROUP BY o.id, o.first_name, o.last_name
       ORDER BY "totalLbs" DESC, MAX(d.date) DESC
       LIMIT $2`,
    [year, limit],
  );
  res.json(result.rows);
});

export const getDonor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT d.id, d.first_name AS "firstName", d.last_name AS "lastName", d.email,
            COALESCE(SUM(n.weight), 0)::int AS "totalLbs",
            TO_CHAR(MAX(n.date), 'YYYY-MM-DD') AS "lastDonationISO"
       FROM donors d
       LEFT JOIN donations n ON n.donor_email = d.email
       WHERE d.id = $1
       GROUP BY d.id, d.first_name, d.last_name, d.email`,
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
       JOIN donors d ON n.donor_email = d.email
       WHERE d.id = $1
       ORDER BY n.date DESC, n.id DESC`,
    [id],
  );
  res.json(result.rows);
});

