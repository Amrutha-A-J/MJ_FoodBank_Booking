import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';

export async function getAppConfig(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      "SELECT value FROM app_config WHERE key = 'cart_tare'",
    );
    const cartTare = Number(result.rows[0]?.value ?? 0);
    res.json({ cartTare });
  } catch (error) {
    logger.error('Error fetching app config:', error);
    next(error);
  }
}

export async function updateAppConfig(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { cartTare } = req.body;
    await pool.query(
      `INSERT INTO app_config (key, value) VALUES ('cart_tare', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [String(cartTare)],
    );
    res.json({ cartTare });
  } catch (error) {
    logger.error('Error updating app config:', error);
    next(error);
  }
}
