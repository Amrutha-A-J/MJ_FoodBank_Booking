import logger from './logger';
import { sendEmail } from './emailUtils';
import config from '../config';

interface EmailJob {
  to: string;
  subject: string;
  body: string;
  retries: number;
}

const queue: EmailJob[] = [];
let processing = false;

export function enqueueEmail(to: string, subject: string, body: string, retries = 0): void {
  queue.push({ to, subject, body, retries });
  processQueue().catch((err) => logger.error('Email queue processing error:', err));
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const job = queue.shift()!;
    try {
      await sendEmail(job.to, job.subject, job.body);
    } catch (err) {
      if (job.retries < config.emailQueueMaxRetries) {
        job.retries += 1;
        const delay = config.emailQueueBackoffMs * 2 ** (job.retries - 1);
        setTimeout(() => {
          queue.push(job);
          processQueue().catch((e) => logger.error('Email queue processing error:', e));
        }, delay);
      } else {
        logger.error('Failed to send email job after max retries', err);
      }
    }
  }
  processing = false;
}

