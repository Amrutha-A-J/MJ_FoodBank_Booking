import config from './config';
import pool from './db';
import { setupDatabase } from './setupDatabase';
import logger from './utils/logger';
import app from './app';
import { startBookingReminderJob } from './utils/bookingReminderJob';
import { startVolunteerShiftReminderJob } from './utils/volunteerShiftReminderJob';
import { initEmailQueue } from './utils/emailQueue';

const PORT = config.port;

async function init() {
  try {
    await setupDatabase();
    const client = await pool.connect();
    logger.info('✅ Connected to the database successfully!');
    client.release();

    initEmailQueue();
    app.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
    });
    startBookingReminderJob();
    startVolunteerShiftReminderJob();
  } catch (err) {
    logger.error('❌ Failed to connect to the database:', err);
    process.exit(1);
  }
}

init();
