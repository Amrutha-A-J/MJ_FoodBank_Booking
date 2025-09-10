import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';
import {
  listPantryWeekly,
  listPantryMonthly,
  listPantryYearly,
  listAvailableYears,
  listAvailableMonths,
  listAvailableWeeks,
  exportPantryWeekly,
  exportPantryMonthly,
  exportPantryYearly,
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} from './pantry/pantryAggregationController';

export {
  listAvailableYears,
  listAvailableMonths,
  listAvailableWeeks,
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
};

export async function listWeeklyAggregations(req: Request, res: Response, next: NextFunction) {
  return listPantryWeekly(req, res, next);
}

export async function listMonthlyAggregations(req: Request, res: Response, next: NextFunction) {
  return listPantryMonthly(req, res, next);
}

export async function listYearlyAggregations(req: Request, res: Response, next: NextFunction) {
  return listPantryYearly(req, res, next);
}

export async function exportAggregations(req: Request, res: Response, next: NextFunction) {
  const period = req.query.period;
  if (period === 'weekly') return exportPantryWeekly(req, res, next);
  if (period === 'monthly') return exportPantryMonthly(req, res, next);
  if (period === 'yearly') return exportPantryYearly(req, res, next);
  return res.status(400).json({ message: 'Invalid period' });
}

export async function rebuildAggregations(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      `SELECT MIN(EXTRACT(YEAR FROM date))::int AS min_year,
              MAX(EXTRACT(YEAR FROM date))::int AS max_year
         FROM (
           SELECT date FROM client_visits
           UNION ALL
           SELECT date FROM sunshine_bag_log
         ) d`,
    );

    const minYear = Number(result.rows[0]?.min_year);
    const maxYear = Number(result.rows[0]?.max_year);

    if (minYear && maxYear) {
      for (let y = minYear; y <= maxYear; y++) {
        for (let m = 1; m <= 12; m++) {
          for (let w = 1; w <= 6; w++) {
            await refreshPantryWeekly(y, m, w);
          }
          await refreshPantryMonthly(y, m);
        }
        await refreshPantryYearly(y);
      }
    }

    res.json({ message: 'Rebuilt' });
  } catch (error) {
    logger.error('Error rebuilding pantry aggregations:', error);
    next(error);
  }
}

