import logger from './logger';
import { sendEmail } from './emailUtils';

interface EmailJob {
  to: string;
  subject: string;
  body: string;
}

const queue: EmailJob[] = [];
let processing = false;

export function enqueueEmail(to: string, subject: string, body: string): void {
  queue.push({ to, subject, body });
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
      logger.error('Failed to send email job:', err);
    }
  }
  processing = false;
}

