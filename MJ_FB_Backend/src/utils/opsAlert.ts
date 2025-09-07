import config from '../config';
import { sendEmail } from './emailUtils';
import logger from './logger';

export async function alertOps(job: string, err: unknown): Promise<void> {
  if (!config.opsAlertEmails.length) return;
  const subject = `[MJFB] ${job} failed`;
  const body = `Job ${job} failed with error: ${err instanceof Error ? err.message : String(err)}`;
  await Promise.all(
    config.opsAlertEmails.map(email =>
      sendEmail(email, subject, body).catch(e => logger.error('Failed to send ops alert', e)),
    ),
  );
}
