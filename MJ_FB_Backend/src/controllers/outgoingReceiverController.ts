import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

export async function listOutgoingReceivers(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query('SELECT id, name FROM outgoing_receivers ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing outgoing receivers:', error);
    next(error);
  }
}

export async function addOutgoingReceiver(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body;
    const result = await pool.query('INSERT INTO outgoing_receivers (name) VALUES ($1) RETURNING id, name', [name]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Receiver already exists' });
    }
    logger.error('Error adding outgoing receiver:', error);
    next(error);
  }
}
