import config from './config';
import pool from './db';
import { setupDatabase } from './setupDatabase';
import { runMigrations } from './runMigrations';
import logger from './utils/logger';
import app from './app';
import { alertOps } from './utils/opsAlert';
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
import {
  startExpiredTokenCleanupJob,
  stopExpiredTokenCleanupJob,
} from './utils/expiredTokenCleanupJob';
import { startPayPeriodCronJob, stopPayPeriodCronJob } from './utils/payPeriodCronJob';
import { initEmailQueue, shutdownQueue } from './utils/emailQueue';
import { startEmailQueueCleanupJob, stopEmailQueueCleanupJob } from './utils/emailQueueCleanupJob';
import seedPayPeriods from './utils/payPeriodSeeder';
import seedTimesheets from './utils/timesheetSeeder';
import {
  startTimesheetSeedJob,
  stopTimesheetSeedJob,
} from './utils/timesheetSeedJob';
import { startRetentionJob, stopRetentionJob } from './utils/bookingRetentionJob';
import { startPantryRetentionJob, stopPantryRetentionJob } from './utils/pantryRetentionJob';
import {
  startPasswordTokenCleanupJob,
  stopPasswordTokenCleanupJob,
} from './utils/passwordTokenCleanupJob';
import { startLogCleanupJob, stopLogCleanupJob } from './utils/logCleanupJob';
import {
  startBlockedSlotCleanupJob,
  stopBlockedSlotCleanupJob,
} from './utils/blockedSlotCleanupJob';
import { startDbBloatMonitorJob, stopDbBloatMonitorJob } from './utils/dbBloatMonitorJob';


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
    startExpiredTokenCleanupJob();
    startEmailQueueCleanupJob();
    startPayPeriodCronJob();
    await seedPayPeriods('2025-08-03', '2025-12-31');
    await seedTimesheets();
    startTimesheetSeedJob();
    startRetentionJob();
    startPantryRetentionJob();
    startPasswordTokenCleanupJob();
    startLogCleanupJob();
    startBlockedSlotCleanupJob();
    startDbBloatMonitorJob();
  } catch (err) {
    logger.error('❌ Failed to connect to the database:', err);
    await alertOps('Server startup', err);
    process.exit(1);
  }
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  stopBookingReminderJob();
  stopVolunteerShiftReminderJob();
  stopNoShowCleanupJob();
  stopVolunteerNoShowCleanupJob();
  stopExpiredTokenCleanupJob();
  stopEmailQueueCleanupJob();
  stopTimesheetSeedJob();
  stopPayPeriodCronJob();
  stopRetentionJob();
  stopPantryRetentionJob();
  stopPasswordTokenCleanupJob();
  stopLogCleanupJob();
  stopBlockedSlotCleanupJob();
  stopDbBloatMonitorJob();
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
