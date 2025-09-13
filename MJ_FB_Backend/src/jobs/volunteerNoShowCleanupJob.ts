import cron from 'node-cron';
import pool from '../db';
import logger from '../utils/logger';
import config from '../config';
import { alertOps, notifyOps } from '../utils/opsAlert';

/**
 * Mark past approved volunteer bookings as no-show.
 */
export async function cleanupVolunteerNoShows(): Promise<void> {
  const hours = config.volunteerNoShowHours;
  try {
    const res = await pool.query(
      `UPDATE volunteer_bookings vb
       SET status='no_show'
       FROM volunteer_slots vs
       WHERE vb.slot_id = vs.slot_id
         AND vb.status='approved'
         AND (vb.date + vs.end_time) < NOW() - $1::int * INTERVAL '1 hour'
       RETURNING vb.id`,
      [hours],
    );
    await notifyOps(`cleanupVolunteerNoShows marked ${res.rowCount} bookings`);
    if (res.rowCount && res.rowCount > 0) {
      const ids = res.rows.map((r: any) => r.id).join(', ');
      logger.info('Marked volunteer bookings as no_show', { ids });
    } else {
      logger.info('No volunteer bookings to mark as no_show');
    }
  } catch (err) {
    logger.error('Failed to clean up volunteer no-shows', err);
    await alertOps('cleanupVolunteerNoShows', err);
  }
}

let job: cron.ScheduledTask | undefined;

/**
 * Schedule the volunteer no-show cleanup job to run nightly at 7:00 PM Regina time.
 */
export function startVolunteerNoShowCleanupJob(): void {
  job = cron.schedule(
    '0 19 * * *',
    () => {
      void cleanupVolunteerNoShows();
    },
    { timezone: 'America/Regina' },
  );
}

/**
 * Stop the scheduled volunteer no-show cleanup job.
 */
export function stopVolunteerNoShowCleanupJob(): void {
  if (job) {
    job.stop();
    job = undefined;
  }
}

