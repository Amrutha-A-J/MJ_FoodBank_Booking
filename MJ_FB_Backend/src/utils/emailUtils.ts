import config from '../config';
import logger from './logger';

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!config.brevoApiKey || !config.brevoSenderEmail) {
    logger.warn('Brevo email configuration is missing');
    return;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          email: config.brevoSenderEmail,
          ...(config.brevoSenderName ? { name: config.brevoSenderName } : {}),
        },
        to: [{ email: to }],
        subject,
        htmlContent: body,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error(`Failed to send email: ${response.status} ${text}`);
    }
  } catch (error) {
    logger.error('Failed to send email:', error);
  }
}
