import pool from '../db';
import { enqueueEmail } from './emailQueue';
import { formatReginaDate, formatReginaDateWithDay, formatTimeToAmPm } from './dateUtils';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { buildCancelRescheduleLinks } from './emailUtils';
import config from '../config';
import { alertOps } from './opsAlert';

/**
 * Send reminder emails for volunteer shifts scheduled for the next day.
 */
export async function sendNextDayVolunteerShiftReminders(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDate = formatReginaDate(tomorrow);
  const formattedDate = formatReginaDateWithDay(nextDate);
  try {
    const res = await pool.query(
      `SELECT v.email, vb.volunteer_id, vs.start_time, vs.end_time, vb.reschedule_token
       FROM volunteer_bookings vb
       JOIN volunteers v ON vb.volunteer_id = v.id
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       WHERE vb.status = 'approved' AND vb.date = $1`,
      [nextDate],
    );
    for (const row of res.rows) {
      if (!row.email) continue;
      const time =
        row.start_time && row.end_time
          ? ` from ${formatTimeToAmPm(row.start_time)} to ${formatTimeToAmPm(row.end_time)}`
          : '';
      const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(
        row.reschedule_token,
      );
      const body = `Date: ${formattedDate}${time}`;
      enqueueEmail({
        to: row.email,
        templateId: config.volunteerBookingReminderTemplateId,
        params: { body, cancelLink, rescheduleLink, type: 'Volunteer Shift' },
      });
    }
  } catch (err) {
    logger.error('Failed to send volunteer shift reminders', err);
    await alertOps('sendNextDayVolunteerShiftReminders', err);
  }
}

/**
 * Schedule the volunteer shift reminder job to run once a day at 9:00 AM Regina time.
 */
const createDailyJob = scheduleDailyJob.createDailyJob ?? scheduleDailyJob;

const volunteerShiftReminderJob = createDailyJob(
  sendNextDayVolunteerShiftReminders,
  '0 19 * * *',
  false,
  false,
);

export const startVolunteerShiftReminderJob = volunteerShiftReminderJob.start;
export const stopVolunteerShiftReminderJob = volunteerShiftReminderJob.stop;

