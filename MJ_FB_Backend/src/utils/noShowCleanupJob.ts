import pool from '../db';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';

/**
 * Mark past approved bookings as no-show.
 */
export async function cleanupNoShows(): Promise<void> {
  try {
    await pool.query(
      "UPDATE bookings SET status='no_show' WHERE status='approved' AND date < CURRENT_DATE",
    );
  } catch (err) {
    logger.error('Failed to clean up no-shows', err);
  }
}

/**
 * Schedule the cleanup job to run nightly at 8:00 PM Regina time.
 */
const noShowCleanupJob = scheduleDailyJob(
  cleanupNoShows,
  '0 20 * * *',
  true,
  true,
);

export const startNoShowCleanupJob = noShowCleanupJob.start;
export const stopNoShowCleanupJob = noShowCleanupJob.stop;

