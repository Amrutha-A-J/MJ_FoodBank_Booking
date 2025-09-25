import pool from '../db';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { alertOps } from './opsAlert';

const createDailyJob = scheduleDailyJob.createDailyJob ?? scheduleDailyJob;

const tables = ['bookings', 'volunteer_bookings', 'email_queue'];

export async function runVacuum(): Promise<void> {
  for (const table of tables) {
    try {
      await pool.query(`VACUUM (ANALYZE) ${table}`);
      logger.info('VACUUM ANALYZE complete', { table });
    } catch (err) {
      logger.error(`VACUUM ANALYZE failed for ${table}`, err);
      await alertOps(`vacuumJob:${table}`, err);
    }
  }
}

const vacuumJob = createDailyJob(runVacuum, '0 1 * * *', false, true);

export const startVacuumJob = vacuumJob.start;
export const stopVacuumJob = vacuumJob.stop;

