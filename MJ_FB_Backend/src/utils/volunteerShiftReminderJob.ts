import pool from '../db';
import { enqueueEmail } from './emailQueue';
import { formatReginaDate } from './dateUtils';
import logger from './logger';

/**
 * Send reminder emails for volunteer shifts scheduled for the next day.
 */
export async function sendNextDayVolunteerShiftReminders(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDate = formatReginaDate(tomorrow);
  try {
    const res = await pool.query(
      `SELECT v.email, vs.start_time, vs.end_time
       FROM volunteer_bookings vb
       JOIN volunteers v ON vb.volunteer_id = v.id
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       WHERE vb.status = 'approved' AND vb.date = $1`,
      [nextDate],
    );
    for (const row of res.rows) {
      if (!row.email) continue;
      const time = row.start_time && row.end_time ? ` from ${row.start_time} to ${row.end_time}` : '';
      enqueueEmail(
        row.email,
        'Volunteer Shift Reminder',
        `This is a reminder for your volunteer shift on ${nextDate}${time}.`,
      );
    }
  } catch (err) {
    logger.error('Failed to send volunteer shift reminders', err);
  }
}

/**
 * Schedule the volunteer shift reminder job to run once a day.
 */
let volunteerShiftReminderInterval: NodeJS.Timeout | undefined;

export function startVolunteerShiftReminderJob(): void {
  if (process.env.NODE_ENV === 'test') return;
  // Run immediately and then every 24 hours.
  // Consider using a fixed-time scheduler such as node-cron for predictable execution.
  sendNextDayVolunteerShiftReminders().catch((err) =>
    logger.error('Initial volunteer shift reminder run failed', err),
  );
  const dayMs = 24 * 60 * 60 * 1000;
  volunteerShiftReminderInterval = setInterval(() => {
    sendNextDayVolunteerShiftReminders().catch((err) =>
      logger.error('Scheduled volunteer shift reminder run failed', err),
    );
  }, dayMs);
}

export function stopVolunteerShiftReminderJob(): void {
  if (volunteerShiftReminderInterval) {
    clearInterval(volunteerShiftReminderInterval);
    volunteerShiftReminderInterval = undefined;
  }
}

