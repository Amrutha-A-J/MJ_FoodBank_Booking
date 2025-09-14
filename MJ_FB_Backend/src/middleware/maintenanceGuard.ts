import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export default async function maintenanceGuard(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.method === 'OPTIONS') return next();
  // Tests run without an authenticated user; skip DB calls
  if (process.env.NODE_ENV === 'test') return next();
  const role = req.user?.role;
  // Staff and admin users bypass maintenance checks without a DB hit
  if (role === 'staff' || role === 'admin') return next();
  try {
    const result = await pool.query(
      "SELECT value FROM app_config WHERE key = 'maintenance_mode'",
    );
    const maintenanceMode = result.rows[0]?.value === 'true';
    if (!maintenanceMode) return next();
    if (req.path.startsWith('/maintenance')) return next();
    if (req.path === '/auth/login') return next();
    return res
      .status(503)
      .json({ message: 'Service unavailable due to maintenance' });
  } catch (error) {
    next(error);
  }
}
