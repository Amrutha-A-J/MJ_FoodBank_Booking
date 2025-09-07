import pool from '../db';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';

/**
 * Remove non-recurring blocked slots from past dates.
 */
export async function cleanupPastBlockedSlots(): Promise<void> {
  try {
    await pool.query('DELETE FROM blocked_slots WHERE date < CURRENT_DATE');
  } catch (err) {
    logger.error('Failed to clean up blocked slots', err);
  }
}

/**
 * Schedule the cleanup job to run nightly at 2:00 AM Regina time.
 */
const blockedSlotCleanupJob = scheduleDailyJob(
  cleanupPastBlockedSlots,
  '0 2 * * *',
  true,
  true,
);

export const startBlockedSlotCleanupJob = blockedSlotCleanupJob.start;
export const stopBlockedSlotCleanupJob = blockedSlotCleanupJob.stop;

