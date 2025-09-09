import { Request, Response, NextFunction } from 'express';
import {
  listPantryWeekly,
  listPantryMonthly,
  listPantryYearly,
  listAvailableYears,
  exportPantryWeekly,
  exportPantryMonthly,
  exportPantryYearly,
} from './pantry/pantryAggregationController';

export { listAvailableYears };

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
    res.json({ message: 'Rebuilt' });
  } catch (error) {
    next(error);
  }
}

