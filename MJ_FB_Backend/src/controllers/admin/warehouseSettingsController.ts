import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';
import {
  getWarehouseSettings,
  updateWarehouseSettings,
} from '../../utils/warehouseSettings';

export async function getWarehouseSettingsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const settings = await getWarehouseSettings();
    res.json(settings);
  } catch (error) {
    logger.error('Error fetching warehouse settings:', error);
    next(error);
  }
}

export async function updateWarehouseSettingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { breadWeightMultiplier, cansWeightMultiplier } = req.body;
    await updateWarehouseSettings({ breadWeightMultiplier, cansWeightMultiplier });
    res.json({ breadWeightMultiplier, cansWeightMultiplier });
  } catch (error) {
    logger.error('Error updating warehouse settings:', error);
    next(error);
  }
}
