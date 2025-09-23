import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';
import { refreshPantryMonthly, refreshPantryYearly } from './pantry/pantryAggregationController';
import { refreshWarehouseOverall } from './warehouse/warehouseOverallController';
import { refreshSunshineBagOverall } from './sunshineBagController';
import type {
  MaintenanceCleanupPayload,
  MaintenancePurgePayload,
} from '../schemas/maintenanceSchema';
import {
  cleanupOldRecords,
  getRetentionCutoffDate,
  RETENTION_YEARS,
} from '../utils/bookingRetentionJob';

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
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tableParam = (req.query as { table?: unknown }).table;
    let queryText =
      'SELECT schemaname, relname, n_dead_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC';
    const params: string[] = [];

    if (tableParam !== undefined) {
      if (Array.isArray(tableParam)) {
        const error = new Error('table must be a single table name');
        (error as Error & { status?: number }).status = 400;
        throw error;
      }

      if (typeof tableParam !== 'string') {
        const error = new Error('table must be a string');
        (error as Error & { status?: number }).status = 400;
        throw error;
      }

      const table = tableParam.trim();
      if (!TABLE_NAME_PATTERN.test(table)) {
        const error = new Error(`Invalid table name: ${table || tableParam}`);
        (error as Error & { status?: number }).status = 400;
        throw error;
      }

      queryText =
        'SELECT schemaname, relname, n_dead_tup FROM pg_stat_user_tables WHERE relname = $1 ORDER BY n_dead_tup DESC';
      params.push(table);
    }

    const result = await pool.query(queryText, params);
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

export async function getMaintenanceSettings(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query(
      "SELECT key, value FROM app_config WHERE key IN ('maintenance_mode','maintenance_upcoming_notice')",
    );
    const config: Record<string, string> = {};
    for (const row of result.rows) {
      config[row.key] = row.value;
    }
    res.json({
      maintenanceMode: config.maintenance_mode === 'true',
      upcomingNotice: config.maintenance_upcoming_notice ?? null,
    });
  } catch (error) {
    logger.error('Error fetching maintenance settings:', error);
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

export async function setMaintenanceUpcomingNotice(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { upcomingNotice } = req.body as { upcomingNotice?: string };
  if (upcomingNotice === undefined) return next();
  const normalized = upcomingNotice.trim();
  try {
    if (normalized) {
      await pool.query(
        "INSERT INTO app_config (key, value) VALUES ('maintenance_upcoming_notice', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        [normalized],
      );
    } else {
      await pool.query(
        "DELETE FROM app_config WHERE key = 'maintenance_upcoming_notice'",
      );
    }
    next();
  } catch (error) {
    logger.error('Error setting maintenance upcoming notice:', error);
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
      "DELETE FROM app_config WHERE key IN ('maintenance_mode','maintenance_notice','maintenance_upcoming_notice')",
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

type YearMonth = { year: number; month: number };

type AllowedTableConfig = {
  dateColumn: string;
  aggregation?: 'pantry' | 'warehouse' | 'sunshine' | 'volunteer';
};

const ALLOWED_TABLES: Record<string, AllowedTableConfig> = {
  bookings: { dateColumn: 'date' },
  client_visits: { dateColumn: 'date', aggregation: 'pantry' },
  volunteer_bookings: { dateColumn: 'date', aggregation: 'volunteer' },
  monetary_donations: { dateColumn: 'date', aggregation: 'warehouse' },
  donations: { dateColumn: 'date', aggregation: 'warehouse' },
  pig_pound_log: { dateColumn: 'date', aggregation: 'warehouse' },
  outgoing_donation_log: { dateColumn: 'date', aggregation: 'warehouse' },
  surplus_log: { dateColumn: 'date', aggregation: 'warehouse' },
  sunshine_bag_log: { dateColumn: 'date', aggregation: 'sunshine' },
};

function badRequest(message: string) {
  const error = new Error(message);
  (error as Error & { status?: number }).status = 400;
  return error;
}

function parseYearMonth(value: unknown): YearMonth {
  if (value instanceof Date) {
    return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1 };
  }
  if (typeof value === 'string') {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
    }
  }
  throw new Error('Unable to parse month value');
}

function formatYearMonth({ year, month }: YearMonth) {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

export async function purgeMaintenanceData(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { tables, before } = req.body as MaintenancePurgePayload;
    const uniqueTables = Array.from(new Set(tables));
    if (uniqueTables.length === 0) {
      throw badRequest('At least one table is required');
    }

    const cutoffPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!cutoffPattern.test(before)) {
      throw badRequest('Cutoff date must use YYYY-MM-DD format');
    }

    const cutoffDate = new Date(`${before}T00:00:00Z`);
    if (Number.isNaN(cutoffDate.getTime())) {
      throw badRequest('Cutoff date is invalid');
    }

    const currentYear = new Date().getUTCFullYear();
    const januaryFirst = new Date(Date.UTC(currentYear, 0, 1));
    if (cutoffDate >= januaryFirst) {
      throw badRequest('Cutoff date must be before January 1 of the current year');
    }

    const cutoffISO = cutoffDate.toISOString().slice(0, 10);

    const monthsByTable = new Map<string, YearMonth[]>();
    const warehouseMonths = new Map<string, YearMonth>();
    const sunshineMonths = new Map<string, YearMonth>();

    for (const table of uniqueTables) {
      const config = ALLOWED_TABLES[table];
      if (!config) {
        throw badRequest(`Unsupported table: ${table}`);
      }
      const { rows } = await pool.query(
        `SELECT DISTINCT DATE_TRUNC('month', ${config.dateColumn})::date AS month_start FROM ${table} WHERE ${
          config.dateColumn
        } < $1 ORDER BY 1`,
        [cutoffISO],
      );
      const months = rows.map(row => parseYearMonth(row.month_start));
      monthsByTable.set(table, months);
      if (config.aggregation === 'warehouse') {
        for (const month of months) {
          const key = formatYearMonth(month);
          if (!warehouseMonths.has(key)) warehouseMonths.set(key, month);
        }
      }
      if (config.aggregation === 'sunshine') {
        for (const month of months) {
          const key = formatYearMonth(month);
          if (!sunshineMonths.has(key)) sunshineMonths.set(key, month);
        }
      }
    }

    const clientVisitMonths = monthsByTable.get('client_visits') ?? [];
    for (const { year, month } of clientVisitMonths) {
      await refreshPantryMonthly(year, month);
    }
    const pantryYears = Array.from(new Set(clientVisitMonths.map(m => m.year)));
    for (const year of pantryYears) {
      await refreshPantryYearly(year);
    }

    for (const { year, month } of warehouseMonths.values()) {
      await refreshWarehouseOverall(year, month);
    }

    for (const { year, month } of sunshineMonths.values()) {
      await refreshSunshineBagOverall(year, month);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (uniqueTables.includes('volunteer_bookings')) {
        await client.query(
          `UPDATE volunteers v
           SET archived_hours = archived_hours + s.completed_hours,
               archived_shifts = archived_shifts + s.completed_shifts,
               archived_bookings = archived_bookings + s.total_bookings,
               archived_no_shows = archived_no_shows + s.no_shows,
               has_early_bird = has_early_bird OR s.early_bird
           FROM (
             SELECT vb.volunteer_id,
                    COALESCE(SUM(CASE WHEN vb.status='completed' THEN EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600 ELSE 0 END),0) AS completed_hours,
                    COUNT(*) FILTER (WHERE vb.status='completed') AS completed_shifts,
                    COUNT(*) FILTER (WHERE vb.status IN ('approved','completed','no_show')) AS total_bookings,
                    COUNT(*) FILTER (WHERE vb.status='no_show') AS no_shows,
                    BOOL_OR(vs.start_time < '09:00:00' AND vb.status='completed') AS early_bird
             FROM volunteer_bookings vb
             JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
             WHERE vb.date < $1
             GROUP BY vb.volunteer_id
           ) s
           WHERE v.id = s.volunteer_id`,
          [cutoffISO],
        );
      }

      for (const table of uniqueTables) {
        const { dateColumn } = ALLOWED_TABLES[table];
        await client.query(`DELETE FROM ${table} WHERE ${dateColumn} < $1`, [cutoffISO]);
      }

      await client.query('COMMIT');
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }

    for (const table of uniqueTables) {
      try {
        await pool.query(`VACUUM (ANALYZE) ${table}`);
      } catch (vacuumError) {
        logger.error(`Failed to VACUUM table after purge: ${table}`, vacuumError);
      }
    }

    res.json({
      success: true,
      cutoff: cutoffISO,
      purged: uniqueTables.map(table => ({
        table,
        months: (monthsByTable.get(table) ?? []).map(formatYearMonth),
      })),
    });
  } catch (error) {
    logger.error('Failed to purge maintenance data', error);
    next(error);
  }
}

export async function runBookingCleanup(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { before } = (req.body as MaintenanceCleanupPayload) ?? {};
    let referenceDate: Date | undefined;
    if (before) {
      const cutoffPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!cutoffPattern.test(before)) {
        throw badRequest('Cutoff date must use YYYY-MM-DD format');
      }
      const cutoffDate = new Date(`${before}T00:00:00Z`);
      if (Number.isNaN(cutoffDate.getTime())) {
        throw badRequest('Cutoff date is invalid');
      }
      const minimumAllowed = getRetentionCutoffDate();
      if (cutoffDate.getTime() > minimumAllowed.getTime()) {
        throw badRequest('Cutoff date must be at least one year before today');
      }
      referenceDate = new Date(cutoffDate);
      referenceDate.setFullYear(referenceDate.getFullYear() + RETENTION_YEARS);
    }

    await cleanupOldRecords(referenceDate);
    const appliedCutoff = getRetentionCutoffDate(referenceDate ?? new Date());

    res.json({
      success: true,
      retentionYears: RETENTION_YEARS,
      cutoff: appliedCutoff.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to run booking cleanup', error);
    next(error);
  }
}

