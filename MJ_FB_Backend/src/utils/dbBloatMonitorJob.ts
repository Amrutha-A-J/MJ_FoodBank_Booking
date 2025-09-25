import pool from '../db';
import config from '../config';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { alertOps, notifyOps } from './opsAlert';

const createDailyJob = scheduleDailyJob.createDailyJob ?? scheduleDailyJob;

export async function checkDbBloat(): Promise<void> {
  try {
    const res = await pool.query<{ relname: string; n_dead_tup: string }>(
      'SELECT relname, n_dead_tup FROM pg_stat_user_tables WHERE n_dead_tup > $1 ORDER BY n_dead_tup DESC',
      [config.vacuumAlertDeadRowsThreshold],
    );
    if (res.rowCount && res.rowCount > 0) {
      const details = res.rows
        .map(r => `${r.relname} (${Number(r.n_dead_tup)} dead rows)`)
        .join(', ');
      const subject = 'Database tables require vacuum';
      const body = `Tables exceeding dead row threshold ${config.vacuumAlertDeadRowsThreshold}: ${details}`;
      await notifyOps(`${subject}\n${body}`);
    }
  } catch (err) {
    logger.error('Failed to check database bloat', err);
    await alertOps('dbBloatMonitorJob', err);
  }
}

const dbBloatMonitorJob = createDailyJob(checkDbBloat, '0 2 * * *', true, true);

export const startDbBloatMonitorJob = dbBloatMonitorJob.start;
export const stopDbBloatMonitorJob = dbBloatMonitorJob.stop;

