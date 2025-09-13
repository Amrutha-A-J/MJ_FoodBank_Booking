import cron from 'node-cron';
import pool from '../db';
import logger from './logger';
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

let job: cron.ScheduledTask | undefined;

/**
 * Schedule the cleanup job to run nightly at 7:00 PM Regina time.
 */
export function startNoShowCleanupJob(): void {
  job = cron.schedule(
    '0 19 * * *',
    () => {
      void cleanupNoShows();
    },
    { timezone: 'America/Regina' },
  );
}

/**
 * Stop the scheduled cleanup job.
 */
export function stopNoShowCleanupJob(): void {
  if (job) {
    job.stop();
    job = undefined;
  }
}

