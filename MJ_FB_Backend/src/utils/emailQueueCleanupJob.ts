import pool from '../db';
import config from '../config';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { alertOps, notifyOps } from './opsAlert';

export async function cleanupEmailQueue(): Promise<void> {
  try {
    await pool.query(
      "DELETE FROM email_queue WHERE next_attempt < (CURRENT_DATE - $1::int * INTERVAL '1 day')",
      [config.emailQueueMaxAgeDays],
    );
    const countRes = await pool.query<{ count: string }>('SELECT COUNT(*) FROM email_queue');
    const size = Number(countRes.rows[0].count);
    logger.info('Email queue size', { size });
    if (size > config.emailQueueWarningSize) {
      logger.warn('Email queue size exceeds threshold', { size, threshold: config.emailQueueWarningSize });
      await notifyOps(
        `Email queue size ${size} exceeds warning threshold ${config.emailQueueWarningSize}`,
      );
    }
  } catch (err) {
    logger.error('Failed to clean up email queue', err);
    await alertOps('cleanupEmailQueue', err);
  }
}

const emailQueueCleanupJob = scheduleDailyJob(
  cleanupEmailQueue,
  '0 3 * * *',
  true,
  false,
);

export const startEmailQueueCleanupJob = emailQueueCleanupJob.start;
export const stopEmailQueueCleanupJob = emailQueueCleanupJob.stop;

