import pool from '../db';
import config from '../config';
import { sendTemplatedEmail } from './emailUtils';
import logger from './logger';

interface EmailJob {
  id: number;
  to: string;
  templateId: number;
  params: Record<string, unknown>;
  retries: number;
  next_attempt: Date;
}

interface EnqueueOptions {
  to: string;
  templateId: number;
  params?: Record<string, unknown>;
  retries?: number;
}

let processing = false;
let scheduled = false;
const timers = new Set<NodeJS.Timeout>();

export function enqueueEmail({ to, templateId, params = {}, retries = 0 }: EnqueueOptions): void {
  pool
    .query(
      'INSERT INTO email_queue (recipient, template_id, params, retries, next_attempt) VALUES ($1,$2,$3,$4, now())',
      [to, templateId, params, retries],
    )
    .then(() => processQueue().catch((err) => logger.error('Email queue processing error:', err)))
    .catch((err) => logger.error('Failed to enqueue email', err));
}

async function scheduleNextRun(): Promise<void> {
  if (scheduled) return;
  const res = await pool.query('SELECT next_attempt FROM email_queue ORDER BY next_attempt ASC LIMIT 1');
  if (res.rowCount === 0) return;
  const next = res.rows[0].next_attempt as Date;
  const delay = Math.max(0, next.getTime() - Date.now());
  scheduled = true;
  const timeout = setTimeout(() => {
    timers.delete(timeout);
    scheduled = false;
    processQueue().catch((err) => logger.error('Email queue processing error:', err));
  }, delay);
  timers.add(timeout);
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await pool.query<EmailJob>(
        'SELECT id, recipient as to, template_id as "templateId", params, retries, next_attempt FROM email_queue WHERE next_attempt <= now() ORDER BY id LIMIT 1'
      );
      if (res.rowCount === 0) break;
      const job = res.rows[0];
      try {
        await sendTemplatedEmail({ to: job.to, templateId: job.templateId, params: job.params });
        await pool.query('DELETE FROM email_queue WHERE id=$1', [job.id]);
      } catch (err) {
        if (job.retries < config.emailQueueMaxRetries) {
          const newRetries = job.retries + 1;
          const delay = config.emailQueueBackoffMs * 2 ** (newRetries - 1);
          await pool.query(
            'UPDATE email_queue SET retries=$1, next_attempt=now() + $2::int * interval \'1 millisecond\' WHERE id=$3',
            [newRetries, delay, job.id]
          );
        } else {
          logger.error('Failed to send email job after max retries', err);
          await pool.query('DELETE FROM email_queue WHERE id=$1', [job.id]);
        }
      }
    }
  } finally {
    processing = false;
    await scheduleNextRun();
  }
}

export function initEmailQueue(): void {
  processQueue().catch((err) => logger.error('Email queue processing error:', err));
}

export function shutdownQueue(): void {
  for (const t of timers) {
    clearTimeout(t);
  }
  timers.clear();
  scheduled = false;
}

