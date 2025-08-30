import pool from '../db';
import { enqueueEmail } from './emailQueue';
import { formatReginaDate } from './dateUtils';
import logger from './logger';
import cron from 'node-cron';
import config from '../config';
import { sendEmail } from './emailUtils';
import coordinatorEmailsConfig from '../config/coordinatorEmails.json';

const coordinatorEmails: string[] = coordinatorEmailsConfig.coordinatorEmails || [];

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

/**
 * Automatically mark past volunteer bookings as no-show.
 */
export async function markPastVolunteerNoShows(): Promise<void> {
  try {
    const res = await pool.query(
      `UPDATE volunteer_bookings vb
       SET status = 'no_show'
       FROM volunteers v
       JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
       WHERE vb.volunteer_id = v.id
         AND vb.status = 'approved'
         AND vb.date < (now() AT TIME ZONE 'America/Regina' - INTERVAL '${config.volunteerNoShowHours} hours')::date
       RETURNING vb.id, vb.date, v.first_name, v.last_name, vs.start_time, vs.end_time`,
    );
    if (res.rowCount && res.rowCount > 0) {
      const lines = res.rows
        .map(
          r =>
            `${r.first_name} ${r.last_name} on ${r.date}` +
            (r.start_time && r.end_time ? ` (${r.start_time}-${r.end_time})` : ''),
        )
        .join('<br>');
      const subject = 'Volunteer bookings marked as no-show';
      const body = `The following volunteer bookings were automatically marked as no-show:<br>${lines}`;
      await Promise.all(
        coordinatorEmails.map(email => sendEmail(email, subject, body)),
      );
      logger.info(`Marked ${res.rowCount} volunteer bookings as no_show`);
    }
  } catch (err) {
    logger.error('Failed to mark volunteer no-shows', err);
  }
}

/**
 * Schedule the volunteer no-show job to run nightly.
 */
let volunteerNoShowTask: cron.ScheduledTask | undefined;

export function startVolunteerNoShowJob(): void {
  if (process.env.NODE_ENV === 'test') return;
  markPastVolunteerNoShows().catch(err =>
    logger.error('Initial volunteer no-show run failed', err),
  );
  volunteerNoShowTask = cron.schedule(
    '0 0 * * *',
    () => {
      markPastVolunteerNoShows().catch(err =>
        logger.error('Scheduled volunteer no-show run failed', err),
      );
    },
    { timezone: 'America/Regina' },
  );
}

export function stopVolunteerNoShowJob(): void {
  if (volunteerNoShowTask) {
    volunteerNoShowTask.stop();
    volunteerNoShowTask = undefined;
  }
}

