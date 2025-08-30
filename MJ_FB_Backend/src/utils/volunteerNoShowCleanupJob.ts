import pool from '../db';
import logger from './logger';
import cron from 'node-cron';
import config from '../config';
import { formatReginaDate } from './dateUtils';
import coordinatorEmailsConfig from '../config/coordinatorEmails.json';
import { sendEmail } from './emailUtils';

const coordinatorEmails: string[] = coordinatorEmailsConfig.coordinatorEmails || [];

/**
 * Mark past approved volunteer bookings as no-show.
 */
export async function cleanupVolunteerNoShows(): Promise<void> {
  const hours = config.volunteerNoShowHours;
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);
  const cutoffDate = formatReginaDate(cutoff);
  try {
    const res = await pool.query(
      `UPDATE volunteer_bookings vb
       SET status='no_show'
       WHERE vb.status='approved' AND vb.date < $1
       RETURNING vb.id`,
      [cutoffDate],
    );
    if (res.rowCount && res.rowCount > 0) {
      const ids = res.rows.map((r: any) => r.id).join(', ');
      logger.info('Marked volunteer bookings as no_show', { ids });
      const subject = 'Volunteer bookings marked as no_show';
      const body = `The following volunteer bookings were automatically marked as no_show: ${ids}`;
      await Promise.all(
        coordinatorEmails.map(email => sendEmail(email, subject, body)),
      );
    } else {
      logger.info('No volunteer bookings to mark as no_show');
    }
  } catch (err) {
    logger.error('Failed to clean up volunteer no-shows', err);
  }
}

/**
 * Schedule the volunteer no-show cleanup job to run nightly at 8:00 PM Regina time.
 */
let volunteerNoShowCleanupTask: cron.ScheduledTask | undefined;

export function startVolunteerNoShowCleanupJob(): void {
  if (process.env.NODE_ENV === 'test') return;
  // Run immediately and then on the scheduled interval.
  cleanupVolunteerNoShows().catch(err =>
    logger.error('Initial volunteer no-show cleanup failed', err),
  );
  volunteerNoShowCleanupTask = cron.schedule(
    '0 20 * * *',
    () => {
      cleanupVolunteerNoShows().catch(err =>
        logger.error('Scheduled volunteer no-show cleanup failed', err),
      );
    },
    { timezone: 'America/Regina' },
  );
}

export function stopVolunteerNoShowCleanupJob(): void {
  if (volunteerNoShowCleanupTask) {
    volunteerNoShowCleanupTask.stop();
    volunteerNoShowCleanupTask = undefined;
  }
}
