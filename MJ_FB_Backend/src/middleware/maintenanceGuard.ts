import { Request, Response, NextFunction } from 'express';
import pool from '../db';

function normalizeIp(ip?: string) {
  if (!ip) return undefined;
  const trimmed = ip.trim();
  if (!trimmed) return undefined;
  if (trimmed === '::1') return '127.0.0.1';
  if (trimmed.startsWith('::ffff:')) return trimmed.slice(7);
  return trimmed;
}

function getAllowedIps() {
  const raw = process.env['MAINTENANCE_ALLOW_IPS'];
  if (!raw) return [] as string[];
  return raw
    .split(',')
    .map((ip) => normalizeIp(ip))
    .filter((ip): ip is string => Boolean(ip));
}

function isWhitelistedRequest(req: Request, allowedIps: string[]) {
  if (req.path.startsWith('/maintenance')) return true;
  if (req.path === '/auth/login') return true;
  if (allowedIps.length === 0) return false;
  const requestIps = new Set(
    [req.ip, ...(req.ips || [])]
      .map((ip) => normalizeIp(ip))
      .filter((ip): ip is string => Boolean(ip)),
  );
  if (requestIps.size === 0) return false;
  return allowedIps.some((ip) => requestIps.has(ip));
}

function getMaintenanceOverride() {
  const value = process.env['MAINTENANCE_MODE'];
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

export default async function maintenanceGuard(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.method === 'OPTIONS') return next();
  // Tests run without an authenticated user; skip DB calls
  // Use bracket notation so tests can override NODE_ENV at runtime
  if (process.env['NODE_ENV'] === 'test') return next();
  const role = req.user?.role;
  // Staff and admin users bypass maintenance checks without a DB hit
  if (role === 'staff' || role === 'admin') return next();

  const allowedIps = getAllowedIps();
  if (isWhitelistedRequest(req, allowedIps)) return next();

  const override = getMaintenanceOverride();
  if (override === false) return next();
  if (override === true) {
    return res
      .status(503)
      .json({ message: 'Service unavailable due to maintenance' });
  }

  try {
    const result = await pool.query(
      "SELECT value FROM app_config WHERE key = 'maintenance_mode'",
    );
    const maintenanceMode = result.rows[0]?.value === 'true';
    if (!maintenanceMode) return next();
    return res
      .status(503)
      .json({ message: 'Service unavailable due to maintenance' });
  } catch (error) {
    next(error);
  }
}
