import config from '../config';
import logger from './logger';

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!config.brevoApiKey || !config.brevoFromEmail) {
    logger.warn('Brevo email configuration is missing. Email not sent.', { to, subject, body });
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
          email: config.brevoFromEmail,
          name: config.brevoFromName || undefined,
        },
        to: [{ email: to }],
        subject,
        htmlContent: body,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      logger.error('Failed to send email via Brevo', {
        status: response.status,
        responseText,
        to,
        subject,
        body,
      });
    }
  } catch (error) {
    logger.warn(
      'Email not sent. Check Brevo configuration or running in local environment.',
      { to, subject, body, error }
    );
    throw error;
  }
}

interface TemplatedEmailOptions {
  to: string;
  templateId: number;
  params?: Record<string, unknown>;
}

export async function sendTemplatedEmail({
  to,
  templateId,
  params,
}: TemplatedEmailOptions): Promise<void> {
  if (!config.brevoApiKey || !config.brevoFromEmail) {
    logger.warn('Brevo email configuration is missing. Template email not sent.', {
      to,
      templateId,
      params,
    });
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
          email: config.brevoFromEmail,
          name: config.brevoFromName || undefined,
        },
        to: [{ email: to }],
        templateId,
        params: params || undefined,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      logger.error('Failed to send template email via Brevo', {
        status: response.status,
        responseText,
        to,
        templateId,
        params,
      });
    }
  } catch (error) {
    logger.warn(
      'Template email not sent. Check Brevo configuration or running in local environment.',
      { to, templateId, params, error }
    );
    throw error;
  }
}

export function buildCancelRescheduleLinks(
  token: string,
): { cancelLink: string; rescheduleLink: string } {
  const base = config.frontendOrigins[0];
  if (!base) {
    throw new Error('No frontend origin configured; unable to build cancel/reschedule links');
  }
  return {
    cancelLink: `${base}/cancel/${token}`,
    rescheduleLink: `${base}/reschedule/${token}`,
  };
}
