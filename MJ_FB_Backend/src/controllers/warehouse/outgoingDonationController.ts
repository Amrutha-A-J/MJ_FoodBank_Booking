import { Request, Response } from 'express';
import pool from '../../db';
import asyncHandler from '../../middleware/asyncHandler';
import {
  refreshWarehouseForDate,
  refreshWarehouseForDateChange,
} from '../../utils/warehouseRefresh';

export const listOutgoingDonations = asyncHandler(async (req: Request, res: Response) => {
  const date = req.query.date as string;
  if (!date) return res.status(400).json({ message: 'Date required' });
  const result = await pool.query(
    `SELECT d.id, d.date, d.weight, d.receiver_id as "receiverId", r.name as receiver, d.note
       FROM outgoing_donation_log d JOIN outgoing_receivers r ON d.receiver_id = r.id
       WHERE d.date = $1 ORDER BY d.id`,
    [date],
  );
  res.json(result.rows);
});

export const addOutgoingDonation = asyncHandler(async (req: Request, res: Response) => {
  const { date, receiverId, weight, note } = req.body;
  const result = await pool.query(
    'INSERT INTO outgoing_donation_log (date, receiver_id, weight, note) VALUES ($1, $2, $3, $4) RETURNING id, date, receiver_id as "receiverId", weight, note',
    [date, receiverId, weight, note ?? null],
  );
  const recRes = await pool.query('SELECT name FROM outgoing_receivers WHERE id = $1', [receiverId]);
  await refreshWarehouseForDate(date);
  res.status(201).json({ ...result.rows[0], receiver: recRes.rows[0].name });
});

export const updateOutgoingDonation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, receiverId, weight, note } = req.body;
  const existing = await pool.query('SELECT date FROM outgoing_donation_log WHERE id = $1', [id]);
  const oldDate = existing.rows[0]?.date as string | undefined;
  const result = await pool.query(
    'UPDATE outgoing_donation_log SET date = $1, receiver_id = $2, weight = $3, note = $4 WHERE id = $5 RETURNING id, date, receiver_id as "receiverId", weight, note',
    [date, receiverId, weight, note ?? null, id],
  );
  const recRes = await pool.query('SELECT name FROM outgoing_receivers WHERE id = $1', [receiverId]);
  await refreshWarehouseForDateChange(date, oldDate);
  res.json({ ...result.rows[0], receiver: recRes.rows[0].name });
});

export const deleteOutgoingDonation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT date FROM outgoing_donation_log WHERE id = $1', [id]);
  await pool.query('DELETE FROM outgoing_donation_log WHERE id = $1', [id]);
  if (existing.rows[0]) {
    await refreshWarehouseForDate(existing.rows[0].date);
  }
  res.json({ message: 'Deleted' });
});

