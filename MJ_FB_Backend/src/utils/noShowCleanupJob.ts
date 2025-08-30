import pool from '../db';
import logger from './logger';
import cron from 'node-cron';

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
let noShowCleanupTask: cron.ScheduledTask | undefined;

export function startNoShowCleanupJob(): void {
  if (process.env.NODE_ENV === 'test') return;
  // Run immediately and then on the scheduled interval.
  cleanupNoShows().catch((err) =>
    logger.error('Initial no-show cleanup failed', err),
  );
  noShowCleanupTask = cron.schedule(
    '0 20 * * *',
    () => {
      cleanupNoShows().catch((err) =>
        logger.error('Scheduled no-show cleanup failed', err),
      );
    },
    { timezone: 'America/Regina' },
  );
}

export function stopNoShowCleanupJob(): void {
  if (noShowCleanupTask) {
    noShowCleanupTask.stop();
    noShowCleanupTask = undefined;
  }
}

