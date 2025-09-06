import pool from '../db';
import { enqueueEmail } from './emailQueue';
import { formatReginaDate } from './dateUtils';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { buildCancelRescheduleLinks } from './emailUtils';
import config from '../config';

/**
 * Send reminder emails for volunteer shifts scheduled for the next day.
 */
export async function sendNextDayVolunteerShiftReminders(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDate = formatReginaDate(tomorrow);
  try {
    const res = await pool.query(
      `SELECT v.email, vs.start_time, vs.end_time, vb.reschedule_token
       FROM volunteer_bookings vb
       JOIN volunteers v ON vb.volunteer_id = v.id
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       WHERE vb.status = 'approved' AND vb.date = $1`,
      [nextDate],
    );
    for (const row of res.rows) {
      if (!row.email) continue;
      const time = row.start_time && row.end_time ? ` from ${row.start_time} to ${row.end_time}` : '';
      const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(
        row.reschedule_token,
      );
      const body = `Date: ${nextDate}${time}`;
      enqueueEmail({
        to: row.email,
        templateId: config.volunteerBookingReminderTemplateId,
        params: { body, cancelLink, rescheduleLink, type: 'volunteer shift' },
      });
    }
  } catch (err) {
    logger.error('Failed to send volunteer shift reminders', err);
  }
}

/**
 * Schedule the volunteer shift reminder job to run once a day at 9:00 AM Regina time.
 */
const volunteerShiftReminderJob = scheduleDailyJob(
  sendNextDayVolunteerShiftReminders,
  '0 9 * * *',
  true,
  true,
);

export const startVolunteerShiftReminderJob = volunteerShiftReminderJob.start;
export const stopVolunteerShiftReminderJob = volunteerShiftReminderJob.stop;

