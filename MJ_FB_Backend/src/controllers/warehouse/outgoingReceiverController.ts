import { Request, Response } from 'express';
import pool from '../../db';
import { reginaStartOfDayISO } from '../../utils/dateUtils';
import asyncHandler from '../../middleware/asyncHandler';

export const listOutgoingReceivers = asyncHandler(async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT id, name FROM outgoing_receivers ORDER BY name');
  res.json(result.rows);
});

export const addOutgoingReceiver = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const result = await pool.query('INSERT INTO outgoing_receivers (name) VALUES ($1) RETURNING id, name', [name]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Receiver already exists' });
    }
    throw error;
  }
});

export const topOutgoingReceivers = asyncHandler(async (req: Request, res: Response) => {
  const year =
    parseInt((req.query.year as string) ?? '', 10) ||
    new Date(reginaStartOfDayISO(new Date())).getUTCFullYear();
  const limit = parseInt((req.query.limit as string) ?? '', 10) || 7;
  const result = await pool.query(
    `SELECT r.name, SUM(l.weight)::int AS "totalLbs", TO_CHAR(MAX(l.date), 'YYYY-MM-DD') AS "lastPickupISO"
       FROM outgoing_donation_log l JOIN outgoing_receivers r ON l.receiver_id = r.id
       WHERE EXTRACT(YEAR FROM l.date) = $1
       GROUP BY r.id, r.name
       ORDER BY "totalLbs" DESC, MAX(l.date) DESC
       LIMIT $2`,
    [year, limit],
  );
  res.json(result.rows);
});

