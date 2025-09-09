import { Request, Response, NextFunction } from 'express';

export async function listWeeklyAggregations(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json([]);
  } catch (error) {
    next(error);
  }
}

export async function listMonthlyAggregations(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json([]);
  } catch (error) {
    next(error);
  }
}

export async function listYearlyAggregations(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json([]);
  } catch (error) {
    next(error);
  }
}

export async function listAvailableYears(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json([]);
  } catch (error) {
    next(error);
  }
}

export async function exportAggregations(_req: Request, res: Response, next: NextFunction) {
  try {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(Buffer.from(''));
  } catch (error) {
    next(error);
  }
}

export async function rebuildAggregations(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ message: 'Rebuilt' });
  } catch (error) {
    next(error);
  }
}

