import { fetchBookingsForReminder } from '../models/bookingRepository';
import { enqueueEmail } from './emailQueue';
import { sendPushToUser } from './notificationService';
import { formatReginaDate, formatReginaDateWithDay, formatTimeToAmPm } from './dateUtils';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';
import { buildCancelRescheduleLinks } from './emailUtils';
import config from '../config';
import { alertOps } from './opsAlert';

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
      if (b.user_id) {
        sendPushToUser(b.user_id, 'user', {
          title: 'Booking Reminder',
          body,
        });
      }
    }
  } catch (err) {
    logger.error('Failed to send booking reminders', err);
    await alertOps('sendNextDayBookingReminders', err);
    throw err;
  }
}

/**
 * Schedule the reminder job to run once a day at 9:00 AM Regina time.
 */
const bookingReminderJob = scheduleDailyJob(
  sendNextDayBookingReminders,
  '0 9 * * *',
  true,
  true,
);

export const startBookingReminderJob = bookingReminderJob.start;
export const stopBookingReminderJob = bookingReminderJob.stop;

