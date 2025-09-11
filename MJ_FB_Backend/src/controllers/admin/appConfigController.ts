import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';
import { getCartTare, refreshCartTare } from '../../utils/configCache';

export async function getAppConfig(_req: Request, res: Response, next: NextFunction) {
  try {
    const cartTare = await getCartTare();
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
    await refreshCartTare();
    res.json({ cartTare });
  } catch (error) {
    logger.error('Error updating app config:', error);
    next(error);
  }
}
