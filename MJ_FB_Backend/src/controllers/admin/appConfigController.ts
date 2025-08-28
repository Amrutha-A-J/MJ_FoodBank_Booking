import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';

export async function getAppConfig(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query('SELECT key, value FROM app_config');
    const config: Record<string, number> = {};
    for (const row of result.rows) {
      config[row.key] = Number(row.value);
    }
    res.json({
      cartTare: config.cart_tare ?? 0,
      breadWeightMultiplier: config.bread_weight_multiplier ?? 10,
      cansWeightMultiplier: config.cans_weight_multiplier ?? 20,
    });
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
    const { cartTare, breadWeightMultiplier, cansWeightMultiplier } = req.body;
    const entries = [
      ['cart_tare', cartTare],
      ['bread_weight_multiplier', breadWeightMultiplier],
      ['cans_weight_multiplier', cansWeightMultiplier],
    ];
    const values: any[] = [];
    const placeholders = entries
      .map(([_k, _v], i) => {
        values.push(entries[i][0], String(entries[i][1]));
        return `($${i * 2 + 1}, $${i * 2 + 2})`;
      })
      .join(',');
    await pool.query(
      `INSERT INTO app_config (key, value) VALUES ${placeholders}
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      values,
    );
    res.json({ cartTare, breadWeightMultiplier, cansWeightMultiplier });
  } catch (error) {
    logger.error('Error updating app config:', error);
    next(error);
  }
}
