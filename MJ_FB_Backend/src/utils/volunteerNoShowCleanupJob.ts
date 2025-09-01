import pool from '../db';
import logger from './logger';
import cron from 'node-cron';
import config from '../config';
import coordinatorEmailsConfig from '../config/coordinatorEmails.json';
import { sendTemplatedEmail } from './emailUtils';
import { VOLUNTEER_NO_SHOW_NOTIFICATION_TEMPLATE_ID } from '../config/emailTemplates';

const coordinatorEmails: string[] = coordinatorEmailsConfig.coordinatorEmails || [];

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
         AND (vb.date + vs.end_time) < NOW() - INTERVAL '${hours} hours'
       RETURNING vb.id`,
    );
    if (res.rowCount && res.rowCount > 0) {
      const ids = res.rows.map((r: any) => r.id).join(', ');
      logger.info('Marked volunteer bookings as no_show', { ids });
      const params = { ids };
      const results = await Promise.allSettled(
        coordinatorEmails.map(email =>
          sendTemplatedEmail({
            to: email,
            templateId: VOLUNTEER_NO_SHOW_NOTIFICATION_TEMPLATE_ID,
            params,
          }),
        ),
      );
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          logger.error('Failed to send coordinator email', {
            email: coordinatorEmails[idx],
            error: result.reason,
          });
        }
      });
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
