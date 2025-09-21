import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

const TABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function normalizeTables(tables?: unknown): string[] | undefined {
  if (tables === undefined) return undefined;

  if (!Array.isArray(tables)) {
    const error = new Error('tables must be an array of table names');
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const normalized = Array.from(
    new Set(
      tables
        .map(table => (typeof table === 'string' ? table.trim() : String(table)))
        .filter(Boolean),
    ),
  );

  const invalid = normalized.filter(table => !TABLE_NAME_PATTERN.test(table));
  if (invalid.length > 0) {
    const error = new Error(`Invalid table names: ${invalid.join(', ')}`);
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  return normalized;
}

async function vacuumTables(tables?: string[]) {
  if (!tables || tables.length === 0) {
    await pool.query('VACUUM (ANALYZE)');
    logger.info('VACUUM ANALYZE complete for entire database');
    return { scope: 'database' as const, tables: [] as string[] };
  }

  for (const table of tables) {
    await pool.query(`VACUUM (ANALYZE) ${table}`);
    logger.info('VACUUM ANALYZE complete', { table });
  }

  return { scope: 'tables' as const, tables };
}

export async function runVacuum(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tables = normalizeTables((req.body as { tables?: unknown })?.tables);
    const result = await vacuumTables(tables);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to run VACUUM ANALYZE', error);
    next(error);
  }
}

export async function runVacuumForTable(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tables = normalizeTables([req.params.table]);
    const result = await vacuumTables(tables);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Failed to run VACUUM ANALYZE', error);
    next(error);
  }
}

export async function getDeadRowStats(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query(
      `SELECT schemaname, relname, n_dead_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC`,
    );
    const deadRows = result.rows.map(row => ({
      schema: row.schemaname,
      table: row.relname,
      deadRows: Number(row.n_dead_tup) || 0,
    }));
    res.json({ deadRows });
  } catch (error) {
    logger.error('Failed to fetch dead row statistics', error);
    next(error);
  }
}

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

export async function clearMaintenanceStats(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await pool.query('DELETE FROM stats');
    res.sendStatus(204);
  } catch (error) {
    logger.error('Error clearing maintenance stats:', error);
    next(error);
  }
}

