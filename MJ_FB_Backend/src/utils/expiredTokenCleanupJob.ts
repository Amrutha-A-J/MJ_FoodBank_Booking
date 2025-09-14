import pool from '../db';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';

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
  } catch (err) {
    logger.error('Failed to clean up expired tokens', err);
  }
}

/**
 * Schedule the cleanup job to run nightly at 3:00 AM Regina time.
 */
const expiredTokenCleanupJob = scheduleDailyJob(
  cleanupExpiredTokens,
  '0 3 * * *',
  true,
  false,
);

export const startExpiredTokenCleanupJob = expiredTokenCleanupJob.start;
export const stopExpiredTokenCleanupJob = expiredTokenCleanupJob.stop;

