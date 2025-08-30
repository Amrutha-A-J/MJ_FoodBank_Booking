import { fetchBookings } from '../models/bookingRepository';
import { enqueueEmail } from './emailQueue';
import { formatReginaDate } from './dateUtils';
import logger from './logger';

/**
 * Send reminder emails for bookings scheduled for the next day.
 */
export async function sendNextDayBookingReminders(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDate = formatReginaDate(tomorrow);
  try {
    const bookings = await fetchBookings('approved', nextDate);
    for (const b of bookings) {
      if (!b.user_email) continue;
      const time = b.start_time && b.end_time ? ` from ${b.start_time} to ${b.end_time}` : '';
      enqueueEmail(
        b.user_email,
        'Booking Reminder',
        `This is a reminder for your booking on ${nextDate}${time}.`,
      );
    }
  } catch (err) {
    logger.error('Failed to send booking reminders', err);
  }
}

/**
 * Schedule the reminder job to run once a day.
 */
export function startBookingReminderJob(): void {
  if (process.env.NODE_ENV === 'test') return;
  // Run immediately and then every 24 hours
  sendNextDayBookingReminders().catch((err) =>
    logger.error('Initial reminder run failed', err),
  );
  const dayMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    sendNextDayBookingReminders().catch((err) =>
      logger.error('Scheduled reminder run failed', err),
    );
  }, dayMs);
}

