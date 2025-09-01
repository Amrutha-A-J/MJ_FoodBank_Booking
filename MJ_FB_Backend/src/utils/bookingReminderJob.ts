import { fetchBookingsForReminder } from '../models/bookingRepository';
import { enqueueEmail } from './emailQueue';
import { formatReginaDate } from './dateUtils';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { buildCancelRescheduleLinks } from './emailUtils';

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
      const time = b.start_time && b.end_time ? ` from ${b.start_time} to ${b.end_time}` : '';
      const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(
        b.reschedule_token,
      );
      const body = `This is a reminder for your booking on ${nextDate}${time}.`;
      enqueueEmail({
        to: b.user_email,
        templateId: 1,
        params: { body, cancelLink, rescheduleLink },
      });
    }
  } catch (err) {
    logger.error('Failed to send booking reminders', err);
  }
}

/**
 * Schedule the reminder job to run once a day at 9:00 AM Regina time.
 */
const bookingReminderJob = scheduleDailyJob(
  sendNextDayBookingReminders,
  '0 9 * * *',
);

export const startBookingReminderJob = bookingReminderJob.start;
export const stopBookingReminderJob = bookingReminderJob.stop;

