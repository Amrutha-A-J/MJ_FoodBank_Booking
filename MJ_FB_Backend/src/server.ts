import config from './config';
import pool from './db';
import { setupDatabase } from './setupDatabase';
import { runMigrations } from './runMigrations';
import logger from './utils/logger';
import app from './app';
import { startBookingReminderJob, stopBookingReminderJob } from './utils/bookingReminderJob';
import {
  startVolunteerShiftReminderJob,
  stopVolunteerShiftReminderJob,
} from './utils/volunteerShiftReminderJob';
import { startNoShowCleanupJob, stopNoShowCleanupJob } from './utils/noShowCleanupJob';
import {
  startVolunteerNoShowCleanupJob,
  stopVolunteerNoShowCleanupJob,
} from './utils/volunteerNoShowCleanupJob';
import { initEmailQueue, shutdownQueue } from './utils/emailQueue';
import seedTimesheets from './utils/timesheetSeeder';

const PORT = config.port;

let server: ReturnType<typeof app.listen> | undefined;

async function init() {
  try {
    await setupDatabase();
    await runMigrations();
    const client = await pool.connect();
    logger.info('✅ Connected to the database successfully!');
    client.release();

    initEmailQueue();
    server = app.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
    });
    startBookingReminderJob();
    startVolunteerShiftReminderJob();
    startNoShowCleanupJob();
    startVolunteerNoShowCleanupJob();
    await seedTimesheets();
  } catch (err) {
    logger.error('❌ Failed to connect to the database:', err);
    process.exit(1);
  }
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  stopBookingReminderJob();
  stopVolunteerShiftReminderJob();
  stopNoShowCleanupJob();
  stopVolunteerNoShowCleanupJob();
  shutdownQueue();
  if (server) {
    server.close();
  }
  try {
    await pool.end();
  } catch (err) {
    logger.error('Error while closing database pool', err);
  }
  process.exit(0);
}

process.on('SIGINT', (sig) => {
  shutdown(sig).catch((err) => {
    logger.error('Error during shutdown', err);
    process.exit(1);
  });
});

process.on('SIGTERM', (sig) => {
  shutdown(sig).catch((err) => {
    logger.error('Error during shutdown', err);
    process.exit(1);
  });
});

init();
