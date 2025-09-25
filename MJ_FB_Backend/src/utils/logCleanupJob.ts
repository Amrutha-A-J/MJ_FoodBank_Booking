import pool from '../db';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { refreshWarehouseOverall } from '../controllers/warehouse/warehouseOverallController';
import { refreshSunshineBagOverall } from '../controllers/sunshineBagController';

const createDailyJob = scheduleDailyJob.createDailyJob ?? scheduleDailyJob;

export async function cleanupOldLogs(now: Date = new Date()): Promise<void> {
  const currentYear = now.getUTCFullYear();
  const previousYear = currentYear - 1;
  try {
    for (let month = 1; month <= 12; month++) {
      await refreshWarehouseOverall(previousYear, month);
      await refreshSunshineBagOverall(previousYear, month);
    }
    const cutoff = `${currentYear}-01-01`;
    const tables = [
      'sunshine_bag_log',
      'surplus_log',
      'pig_pound_log',
      'outgoing_donation_log',
    ];
    for (const table of tables) {
      await pool.query(`DELETE FROM ${table} WHERE date < $1`, [cutoff]);
    }
  } catch (err) {
    logger.error('Failed to clean up old logs', err);
  }
}

const logCleanupJob = createDailyJob(cleanupOldLogs, '0 2 31 1 *', false);

export const startLogCleanupJob = logCleanupJob.start;
export const stopLogCleanupJob = logCleanupJob.stop;
