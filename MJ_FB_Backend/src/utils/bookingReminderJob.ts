import { fetchBookingsForReminder } from '../models/bookingRepository';
import { formatReginaDate } from './dateUtils';
import logger from './logger';
import cron from 'node-cron';
import {
  sendTemplatedEmail,
  buildCancelRescheduleLinks,
} from './emailUtils';
import config from '../config';

/**
 * Send reminder emails for bookings scheduled for the next day.
 */
export async function sendNextDayBookingReminders(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDate = formatReginaDate(tomorrow);
  try {
    const bookings = await fetchBookingsForReminder(nextDate);
    for (const b of bookings) {
      if (!b.user_email) continue;
      const links = buildCancelRescheduleLinks(b.reschedule_token);
      await sendTemplatedEmail({
        to: b.user_email,
        templateId: config.bookingReminderTemplateId,
        params: {
          date: nextDate,
          startTime: b.start_time,
          endTime: b.end_time,
          ...links,
        },
      });
    }
  } catch (err) {
    logger.error('Failed to send booking reminders', err);
  }
}

/**
 * Schedule the reminder job to run once a day at 9:00 AM Regina time.
 */
let bookingReminderTask: cron.ScheduledTask | undefined;

export function startBookingReminderJob(): void {
  if (process.env.NODE_ENV === 'test') return;
  // Run immediately and then on the scheduled interval.
  sendNextDayBookingReminders().catch((err) =>
    logger.error('Initial reminder run failed', err),
  );
  bookingReminderTask = cron.schedule(
    '0 9 * * *',
    () => {
      sendNextDayBookingReminders().catch((err) =>
        logger.error('Scheduled reminder run failed', err),
      );
    },
    { timezone: 'America/Regina' },
  );
}

export function stopBookingReminderJob(): void {
  if (bookingReminderTask) {
    bookingReminderTask.stop();
    bookingReminderTask = undefined;
  }
}

