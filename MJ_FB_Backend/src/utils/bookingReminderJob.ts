import pool from '../db';
import { fetchBookingsForReminder } from '../models/bookingRepository';
import { enqueueEmail } from './emailQueue';
import { formatReginaDate, formatReginaDateWithDay, formatTimeToAmPm } from './dateUtils';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { buildCancelRescheduleLinks } from './emailUtils';
import config from '../config';
import { alertOps, notifyOps } from './opsAlert';

/**
 * Send reminder emails for bookings scheduled for the next day.
 */
export async function sendNextDayBookingReminders(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDate = formatReginaDate(tomorrow);
  const formattedDate = formatReginaDateWithDay(nextDate);
  try {
    const bookings = await fetchBookingsForReminder(nextDate);
    const recipients: string[] = [];
    for (const b of bookings) {
      if (!b.user_email) continue;
      const time =
        b.start_time && b.end_time
          ? ` from ${formatTimeToAmPm(b.start_time)} to ${formatTimeToAmPm(b.end_time)}`
          : '';
      const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(
        b.reschedule_token,
      );
      const body = `Date: ${formattedDate}${time}`;
      await enqueueEmail({
        to: b.user_email,
        templateId: config.bookingReminderTemplateId,
        params: { body, cancelLink, rescheduleLink, type: 'Shopping Appointment' },
      });
      await pool.query('UPDATE bookings SET reminder_sent = true WHERE id = $1', [
        b.id,
      ]);
      recipients.push(b.user_email);
    }
    await notifyOps(
      `sendNextDayBookingReminders queued reminders for ${
        recipients.length ? recipients.join(', ') : '0 emails'
      }`,
    );
  } catch (err) {
    logger.error('Failed to send booking reminders', err);
    await alertOps('sendNextDayBookingReminders', err);
    throw err;
  }
}

/**
 * Schedule the reminder job to run once a day at 7:00 PM Regina time.
 */
const bookingReminderJob = scheduleDailyJob(
  sendNextDayBookingReminders,
  '0 19 * * *',
  false,
  true,
);

export const startBookingReminderJob = bookingReminderJob.start;
export const stopBookingReminderJob = bookingReminderJob.stop;

