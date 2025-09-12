import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import config from '../config';
import logger from './logger';
import { buildIcsFile } from './calendarLinks';
import { alertOps } from './opsAlert';

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

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
    void alertOps('sendEmail', new Error('Missing Brevo configuration'));
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
      void alertOps('sendEmail', new Error(`Brevo responded with status ${response.status}`));
    }
  } catch (error) {
    logger.warn(
      'Email not sent. Check Brevo configuration or running in local environment.',
      { to, subject, body, error }
    );
    void alertOps('sendEmail', error);
    throw error;
  }
}

interface Attachment {
  name: string;
  content: string;
  type?: string;
}

interface TemplatedEmailOptions {
  to: string;
  templateId: number;
  params?: Record<string, unknown>;
  attachments?: Attachment[];
}

export async function sendTemplatedEmail({
  to,
  templateId,
  params,
  attachments,
}: TemplatedEmailOptions): Promise<void | { skipped: true }> {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(to)) {
    logger.warn('Invalid recipient email provided. Template email not sent.', {
      to,
      templateId,
      params,
      attachments,
    });
    return;
  }

  if (process.env.EMAIL_ENABLED !== 'true') {
    return { skipped: true };
  }

  if (!config.brevoApiKey || !config.brevoFromEmail) {
    logger.warn('Brevo email configuration is missing. Template email not sent.', {
      to,
      templateId,
      params,
      attachments,
    });
    void alertOps('sendTemplatedEmail', new Error('Missing Brevo configuration'));
    return;
  }

  const formattedParams: Record<string, unknown> | undefined = params
    ? { ...params }
    : undefined;
  if (formattedParams && typeof formattedParams['type'] === 'string') {
    formattedParams['type'] = toTitleCase(formattedParams['type'] as string);
  }

  try {
    const body = {
      sender: {
        email: config.brevoFromEmail,
        name: config.brevoFromName || undefined,
      },
      to: [{ email: to }],
      templateId,
      params: formattedParams || undefined,
    } as any;
    if (attachments && attachments.length) {
      body.attachment = attachments;
    }
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.brevoApiKey,
      },
      body: JSON.stringify(body),
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
        attachments,
      });
      const message = `Brevo responded with status ${response.status}${
        responseText ? `: ${responseText}` : ''
      }`;
      void alertOps('sendTemplatedEmail', new Error(message));
    }
  } catch (error) {
    logger.warn(
      'Template email not sent. Check Brevo configuration or running in local environment.',
      { to, templateId, params, attachments, error }
    );
    void alertOps('sendTemplatedEmail', error);
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
  uid?: string,
  sequence = 0,
): {
  googleCalendarLink: string;
  appleCalendarLink: string;
  icsContent: string;
} {
  const start = new Date(`${date}T${startTime ?? '00:00:00'}-06:00`);
  const end = new Date(`${date}T${endTime ?? '23:59:59'}-06:00`);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const googleDates = `${fmt(start)}/${fmt(end)}`;
  const text = encodeURIComponent('Harvest Pantry Booking');
  const googleCalendarLink =
    `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${googleDates}&text=${text}`;
  const ics = buildIcsFile({
    title: 'Harvest Pantry Booking',
    start,
    end,
    description: 'Your booking at the Harvest Pantry',
    location: 'Moose Jaw Food Bank',
    uid,
    method: 'REQUEST',
    sequence,
  });
  const fileName = `${uid ?? randomUUID()}.ics`;
  const appleCalendarLink = saveIcsFile(fileName, ics);
  return { googleCalendarLink, appleCalendarLink, icsContent: ics };
}

export function saveIcsFile(fileName: string, content: string): string {
  if (config.icsBaseUrl) {
    try {
      const dir = path.join(__dirname, '..', '..', 'public', 'ics');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, fileName), content, 'utf8');
      return `${config.icsBaseUrl.replace(/\/$/, '')}/${fileName}`;
    } catch (error) {
      logger.error('Failed to write ICS file, falling back to data URI', error);
    }
  }
  const base64 = Buffer.from(content, 'utf8').toString('base64');
  return `data:text/calendar;charset=utf-8;base64,${base64}`;
}
