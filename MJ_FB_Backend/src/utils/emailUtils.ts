import config from '../config';
import logger from './logger';

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<void | { skipped: true }> {
  if (process.env.EMAIL_ENABLED !== 'true') {
    return { skipped: true };
  }

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

    if (response.ok !== true) {
      const responseText =
        typeof response.text === 'function' ? await response.text() : undefined;
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
}: TemplatedEmailOptions): Promise<void | { skipped: true }> {
  if (process.env.EMAIL_ENABLED !== 'true') {
    return { skipped: true };
  }

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

    if (response.ok !== true) {
      const responseText =
        typeof response.text === 'function' ? await response.text() : undefined;
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
  if (!config.frontendOrigins.length) {
    logger.error('No frontend origin configured; returning placeholder links', { token });
    return {
      cancelLink: '#',
      rescheduleLink: '#',
    };
  }

  const base = config.frontendOrigins[0];
  return {
    cancelLink: `${base}/cancel/${token}`,
    rescheduleLink: `${base}/reschedule/${token}`,
  };
}

export function buildCalendarLinks(
  date: string,
  startTime?: string | null,
  endTime?: string | null,
): { googleCalendarLink: string; outlookCalendarLink: string } {
  const start = new Date(`${date}T${startTime ?? '00:00:00'}-06:00`);
  const end = new Date(`${date}T${endTime ?? '23:59:59'}-06:00`);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const googleDates = `${fmt(start)}/${fmt(end)}`;
  const text = encodeURIComponent('Harvest Pantry Booking');
  const googleCalendarLink =
    `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${googleDates}&text=${text}`;
  const outlookCalendarLink =
    `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${encodeURIComponent(
      start.toISOString(),
    )}&enddt=${encodeURIComponent(end.toISOString())}&subject=${text}`;
  return { googleCalendarLink, outlookCalendarLink };
}
