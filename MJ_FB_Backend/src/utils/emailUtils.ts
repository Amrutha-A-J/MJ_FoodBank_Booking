import config from '../config';
import logger from './logger';

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!config.brevoApiKey || !config.brevoFromEmail) {
    logger.warn('Brevo email configuration is missing. Email not sent.', { to, subject, body });
    return;
  }

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          email: config.brevoFromEmail,
          name: config.brevoFromName || undefined,
        },
        to: [{ email: to }],
        subject,
        htmlContent: body,
      }),
    });
  } catch (error) {
    logger.warn('Email not sent. Check Brevo configuration or running in local environment.', { to, subject, body });
  }
}
