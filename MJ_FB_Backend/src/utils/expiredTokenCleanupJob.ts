import pool from '../db';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';

const createDailyJob = scheduleDailyJob.createDailyJob ?? scheduleDailyJob;

/**
 * Remove expired password setup and email verification tokens.
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await pool.query(
      "DELETE FROM password_setup_tokens WHERE expires_at < (CURRENT_DATE - INTERVAL '10 days')",
    );
    await pool.query(
      "DELETE FROM client_email_verifications WHERE expires_at < (CURRENT_DATE - INTERVAL '10 days')",
    );
    await pool.query('DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP');
  } catch (err) {
    logger.error('Failed to clean up expired tokens', err);
  }
}

/**
 * Schedule the cleanup job to run nightly at 3:00 AM Regina time.
 */
const expiredTokenCleanupJob = createDailyJob(
  cleanupExpiredTokens,
  '0 3 * * *',
  false,
  false,
);

export function startExpiredTokenCleanupJob(): void {
  expiredTokenCleanupJob.start();
}

export const stopExpiredTokenCleanupJob = expiredTokenCleanupJob.stop;

