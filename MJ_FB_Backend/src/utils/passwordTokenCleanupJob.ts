import pool from '../db';
import logger from './logger';
import scheduleDailyJob, { createDailyJob as namedCreateDailyJob } from './scheduleDailyJob';

const createDailyJob =
  typeof namedCreateDailyJob === 'function'
    ? namedCreateDailyJob
    : (
        callback: () => void | Promise<void>,
        schedule: string,
        runOnStart: boolean,
        skipInTest: boolean,
      ) => scheduleDailyJob(callback, schedule, runOnStart, skipInTest);

/**
 * Remove used or expired password setup tokens.
 */
export async function cleanupPasswordTokens(): Promise<void> {
  try {
    await pool.query(
      "DELETE FROM password_setup_tokens WHERE used=true OR expires_at < CURRENT_DATE - INTERVAL '10 days'",
    );
  } catch (err) {
    logger.error('Failed to clean up password setup tokens', err);
  }
}

/**
 * Schedule the cleanup job to run daily at 1:00 AM Regina time.
 */
const passwordTokenCleanupJob = createDailyJob(
  cleanupPasswordTokens,
  '0 1 * * *',
  true,
  false,
);

export const startPasswordTokenCleanupJob = (): void => {
  passwordTokenCleanupJob.start();
};

export const stopPasswordTokenCleanupJob = (): void => {
  passwordTokenCleanupJob.stop();
};

