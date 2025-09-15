import { schedule, ScheduledTask } from 'node-cron';
import pool from '../db';
import logger from '../utils/logger';
import { alertOps } from '../utils/opsAlert';

/**
 * Remove non-recurring blocked slots from past dates.
 */
export async function cleanupPastBlockedSlots(): Promise<void> {
  try {
    await pool.query('DELETE FROM blocked_slots WHERE date < CURRENT_DATE');
  } catch (err) {
    logger.error('Failed to clean up blocked slots', err);
    await alertOps('cleanupPastBlockedSlots', err);
  }
}

// Re-export the scheduler so tests can replace it with a mock implementation.
export { schedule };

let task: ScheduledTask | undefined;

/**
 * Schedule the cleanup job to run nightly at 2:00 AM Regina time.
 */
export function startBlockedSlotCleanupJob(
  cronFn: typeof schedule = schedule,
): void {
  task = cronFn(
    '0 2 * * *',
    () => {
      void cleanupPastBlockedSlots();
    },
    { timezone: 'America/Regina' },
  );
  void cleanupPastBlockedSlots();
}

export function stopBlockedSlotCleanupJob(): void {
  task?.stop();
  task = undefined;
}
