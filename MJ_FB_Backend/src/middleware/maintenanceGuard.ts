import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export default async function maintenanceGuard(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (process.env.NODE_ENV === 'test') return next();
  if (req.method === 'OPTIONS') return next();
  try {
    const result = await pool.query(
      "SELECT value FROM app_config WHERE key = 'maintenance_mode'",
    );
    const maintenanceMode = result.rows[0]?.value === 'true';
    if (!maintenanceMode) return next();
    if (req.path.startsWith('/maintenance')) return next();
    if (req.path === '/auth/login') return next();
    const role = req.user?.role;
    if (role === 'staff' || role === 'admin') return next();
    return res
      .status(503)
      .json({ message: 'Service unavailable due to maintenance' });
  } catch (error) {
    next(error);
  }
}
