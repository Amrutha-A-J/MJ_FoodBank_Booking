import pool from '../db';
import { enqueueEmail } from './emailQueue';
import { formatReginaDate } from './dateUtils';
import logger from './logger';
import cron from 'node-cron';
import { buildCancelRescheduleLinks } from './emailUtils';

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
      const body = `This is a reminder for your volunteer shift on ${nextDate}${time}.`;
      enqueueEmail({
        to: row.email,
        templateId: 1,
        params: { body, cancelLink, rescheduleLink },
      });
    }
  } catch (err) {
    logger.error('Failed to send volunteer shift reminders', err);
  }
}

/**
 * Schedule the volunteer shift reminder job to run once a day at 9:00 AM Regina time.
 */
let volunteerShiftReminderTask: cron.ScheduledTask | undefined;

export function startVolunteerShiftReminderJob(): void {
  if (process.env.NODE_ENV === 'test') return;
  // Run immediately and then on the scheduled interval.
  sendNextDayVolunteerShiftReminders().catch((err) =>
    logger.error('Initial volunteer shift reminder run failed', err),
  );
  volunteerShiftReminderTask = cron.schedule(
    '0 9 * * *',
    () => {
      sendNextDayVolunteerShiftReminders().catch((err) =>
        logger.error('Scheduled volunteer shift reminder run failed', err),
      );
    },
    { timezone: 'America/Regina' },
  );
}

export function stopVolunteerShiftReminderJob(): void {
  if (volunteerShiftReminderTask) {
    volunteerShiftReminderTask.stop();
    volunteerShiftReminderTask = undefined;
  }
}

