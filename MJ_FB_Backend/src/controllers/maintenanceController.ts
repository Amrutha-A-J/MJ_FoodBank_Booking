import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

export async function getMaintenanceStatus(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query(
      "SELECT key, value FROM app_config WHERE key IN ('maintenance_mode','maintenance_notice')",
    );
    const config: Record<string, string> = {};
    for (const row of result.rows) {
      config[row.key] = row.value;
    }
    res.json({
      maintenanceMode: config.maintenance_mode === 'true',
      notice: config.maintenance_notice ?? null,
    });
  } catch (error) {
    logger.error('Error fetching maintenance status:', error);
    next(error);
  }
}

export async function setMaintenanceMode(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { maintenanceMode } = req.body as { maintenanceMode?: boolean };
  if (maintenanceMode === undefined) return next();
  try {
    await pool.query(
      "INSERT INTO app_config (key, value) VALUES ('maintenance_mode', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [maintenanceMode ? 'true' : 'false'],
    );
    next();
  } catch (error) {
    logger.error('Error setting maintenance mode:', error);
    next(error);
  }
}

export async function setMaintenanceNotice(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { notice } = req.body as { notice?: string };
  if (notice === undefined) return next();
  try {
    if (notice) {
      await pool.query(
        "INSERT INTO app_config (key, value) VALUES ('maintenance_notice', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        [notice],
      );
    } else {
      await pool.query(
        "DELETE FROM app_config WHERE key = 'maintenance_notice'",
      );
    }
    next();
  } catch (error) {
    logger.error('Error setting maintenance notice:', error);
    next(error);
  }
}

export async function clearMaintenance(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await pool.query(
      "DELETE FROM app_config WHERE key IN ('maintenance_mode','maintenance_notice')",
    );
    res.json({ maintenanceMode: false, notice: null });
  } catch (error) {
    logger.error('Error clearing maintenance config:', error);
    next(error);
  }
}

