import { refreshPantryMonthly, refreshPantryYearly } from '../controllers/pantryAggregationController';
import pool from '../db';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';

export async function cleanupOldPantryData(): Promise<void> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  for (let month = 1; month <= 12; month++) {
    await refreshPantryMonthly(previousYear, month);
  }
  await refreshPantryYearly(previousYear);

  const cutoff = `${currentYear}-01-01`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM client_visits WHERE date < $1', [cutoff]);
    await client.query('DELETE FROM bookings WHERE date < $1', [cutoff]);
    await client.query('COMMIT');
    logger.info('Old pantry data cleaned up');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to clean up old pantry data', err);
  } finally {
    client.release();
  }
}

const pantryRetentionJob = scheduleDailyJob(
  cleanupOldPantryData,
  '0 3 31 1 *',
  false,
);

export const startPantryRetentionJob = pantryRetentionJob.start;
export const stopPantryRetentionJob = pantryRetentionJob.stop;

