import pool from '../db';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
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
         AND (vb.date + vs.end_time) < NOW() - $1::int * INTERVAL '1 hour'
       RETURNING vb.id`,
      [hours],
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
const volunteerNoShowCleanupJob = scheduleDailyJob(
  cleanupVolunteerNoShows,
  '0 20 * * *',
  true,
);

export const startVolunteerNoShowCleanupJob = volunteerNoShowCleanupJob.start;
export const stopVolunteerNoShowCleanupJob = volunteerNoShowCleanupJob.stop;
