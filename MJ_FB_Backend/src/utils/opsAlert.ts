import config from '../config';
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
  await sendTelegram(message);
}

export async function notifyOps(message: string): Promise<void> {
  const subject = `[MJFB] ${message}`;
  await sendTelegram(subject);
}
