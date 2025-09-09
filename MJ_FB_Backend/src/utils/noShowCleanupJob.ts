import pool from '../db';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { alertOps, notifyOps } from './opsAlert';

/**
 * Mark past approved bookings as no-show.
 */
export async function cleanupNoShows(): Promise<void> {
  try {
    const res = await pool.query(
      "UPDATE bookings SET status='no_show', note=NULL WHERE status='approved' AND date < CURRENT_DATE",
    );
    await notifyOps(`cleanupNoShows marked ${res.rowCount} bookings`);
  } catch (err) {
    logger.error('Failed to clean up no-shows', err);
    await alertOps('cleanupNoShows', err);
  }
}

/**
 * Schedule the cleanup job to run nightly at 7:00 PM Regina time.
 */
const noShowCleanupJob = scheduleDailyJob(
  cleanupNoShows,
  '0 19 * * *',
  false,
  true,
);

export const startNoShowCleanupJob = noShowCleanupJob.start;
export const stopNoShowCleanupJob = noShowCleanupJob.stop;

