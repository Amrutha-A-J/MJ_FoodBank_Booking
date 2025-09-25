import pool from '../db';
import { fetchBookingsForReminder } from '../models/bookingRepository';
import { enqueueEmail } from './emailQueue';
import {
  formatReginaDate,
  formatReginaDateWithDay,
  formatTimeToAmPm,
} from './dateUtils';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { buildCancelRescheduleLinks } from './emailUtils';
import config from '../config';
import { alertOps, notifyOps } from './opsAlert';

const createDailyJob = scheduleDailyJob.createDailyJob ?? scheduleDailyJob;

/**
 * Send reminder emails for bookings scheduled for the next day.
 *
 * @param maxConcurrency Limit concurrent email enqueues; defaults to no limit.
 */
export async function sendNextDayBookingReminders(
  maxConcurrency = Infinity,
): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDate = formatReginaDate(tomorrow);
  const formattedDate = formatReginaDateWithDay(nextDate);
  try {
    const bookings = await fetchBookingsForReminder(nextDate);
    const recipients: string[] = [];
    const ids: number[] = [];
    const errors: unknown[] = [];
    const tasks: Array<() => Promise<void>> = [];
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
      tasks.push(async () => {
        try {
          await enqueueEmail({
            to: b.user_email!,
            templateId: config.bookingReminderTemplateId,
            params: {
              body,
              cancelLink,
              rescheduleLink,
              type: 'Shopping Appointment',
            },
          });
        } catch (err) {
          logger.error('Failed to enqueue booking reminder email', err);
          errors.push(err);
        }
      });
      ids.push(b.id);
      recipients.push(b.user_email);
    }
    for (let i = 0; i < tasks.length; i += maxConcurrency) {
      await Promise.all(tasks.slice(i, i + maxConcurrency).map((fn) => fn()));
    }
    if (errors.length) {
      const aggregateError = new Error('Failed to enqueue booking reminder emails');
      (aggregateError as any).errors = errors;
      throw aggregateError;
    }
    if (ids.length) {
      await pool.query(
        'UPDATE bookings SET reminder_sent = true WHERE id = ANY($1)',
        [ids],
      );
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
const bookingReminderJob = createDailyJob(
  sendNextDayBookingReminders,
  '0 19 * * *',
  false,
  false,
);

export const startBookingReminderJob = bookingReminderJob.start;
export const stopBookingReminderJob = bookingReminderJob.stop;

