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
  const time = new Date().toISOString();
  const details = err instanceof Error ? err.stack ?? err.message : String(err);
  const body = `Time: ${time}\n${details}`;
  await sendTelegram(`${subject}\n${body}`);
}

export async function notifyOps(message: string): Promise<void> {
  const subject = `[MJFB] ${message}`;
  const time = new Date().toISOString();
  await sendTelegram(`${subject}\nTime: ${time}`);
}
