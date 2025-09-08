import config from '../config';
import { sendEmail } from './emailUtils';
import logger from './logger';

async function sendTelegram(message: string): Promise<void> {
  if (!config.telegramBotToken || !config.telegramAlertChatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: config.telegramAlertChatId, text: message }),
    });
  } catch (e) {
    logger.error('Failed to send telegram alert', e);
  }
}

export async function alertOps(job: string, err: unknown): Promise<void> {
  const subject = `[MJFB] ${job} failed`;
  const body = `Job ${job} failed with error: ${err instanceof Error ? err.message : String(err)}`;
  const message = `${subject}\n${body}`;
  const tasks: Promise<unknown>[] = [];
  if (config.opsAlertEmails.length) {
    tasks.push(
      ...config.opsAlertEmails.map(email =>
        sendEmail(email, subject, body).catch(e => logger.error('Failed to send ops alert', e)),
      ),
    );
  }
  tasks.push(sendTelegram(message));
  await Promise.all(tasks);
}

export async function notifyOps(subject: string, body: string): Promise<void> {
  const fullSubject = `[MJFB] ${subject}`;
  const message = `${fullSubject}\n${body}`;
  const tasks: Promise<unknown>[] = [];
  if (config.opsAlertEmails.length) {
    tasks.push(
      ...config.opsAlertEmails.map(email =>
        sendEmail(email, fullSubject, body).catch(e => logger.error('Failed to send ops alert', e)),
      ),
    );
  }
  tasks.push(sendTelegram(message));
  await Promise.all(tasks);
}
