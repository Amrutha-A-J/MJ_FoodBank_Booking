import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

export async function listOutgoingDonations(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: 'Date required' });
    const result = await pool.query(
      `SELECT d.id, d.date, d.weight, d.receiver_id as "receiverId", r.name as receiver, d.note
       FROM outgoing_donation_log d JOIN outgoing_receivers r ON d.receiver_id = r.id
       WHERE d.date = $1 ORDER BY d.id`,
      [date],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing outgoing donations:', error);
    next(error);
  }
}

export async function addOutgoingDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, receiverId, weight, note } = req.body;
    const result = await pool.query(
      'INSERT INTO outgoing_donation_log (date, receiver_id, weight, note) VALUES ($1, $2, $3, $4) RETURNING id, date, receiver_id as "receiverId", weight, note',
      [date, receiverId, weight, note ?? null],
    );
    const recRes = await pool.query('SELECT name FROM outgoing_receivers WHERE id = $1', [receiverId]);
    res.status(201).json({ ...result.rows[0], receiver: recRes.rows[0].name });
  } catch (error) {
    logger.error('Error adding outgoing donation:', error);
    next(error);
  }
}

export async function updateOutgoingDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date, receiverId, weight, note } = req.body;
    const result = await pool.query(
      'UPDATE outgoing_donation_log SET date = $1, receiver_id = $2, weight = $3, note = $4 WHERE id = $5 RETURNING id, date, receiver_id as "receiverId", weight, note',
      [date, receiverId, weight, note ?? null, id],
    );
    const recRes = await pool.query('SELECT name FROM outgoing_receivers WHERE id = $1', [receiverId]);
    res.json({ ...result.rows[0], receiver: recRes.rows[0].name });
  } catch (error) {
    logger.error('Error updating outgoing donation:', error);
    next(error);
  }
}

export async function deleteOutgoingDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM outgoing_donation_log WHERE id = $1', [id]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting outgoing donation:', error);
    next(error);
  }
}
