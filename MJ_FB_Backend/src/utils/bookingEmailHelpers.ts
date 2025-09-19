import { enqueueEmail } from './emailQueue';
import {
  buildCancelRescheduleLinks,
  buildCalendarLinks,
  saveIcsFile,
} from './emailUtils';
import { buildIcsFile } from './calendarLinks';

interface CalendarLinksResult {
  googleCalendarLink: string;
  appleCalendarLink: string;
  icsContent: string;
}

interface BookingCalendarOptions {
  uid: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  sequence?: number;
  fileName?: string;
}

interface CancelEventOptions {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  sequence?: number;
  fileName?: string;
  title?: string;
  description?: string;
  location?: string;
}

export interface SendBookingEmailOptions {
  to: string;
  templateId: number;
  token: string;
  params: Record<string, unknown>;
  calendar: BookingCalendarOptions;
  calendarLinks?: CalendarLinksResult;
  cancelEvent?: CancelEventOptions;
}

export interface SendBookingEmailResult {
  googleCalendarLink: string;
  appleCalendarLink: string;
  appleCalendarCancelLink?: string;
}

function ensureLinks(
  calendar: BookingCalendarOptions,
  override?: CalendarLinksResult,
): CalendarLinksResult {
  if (override) {
    return override;
  }

  const { date, startTime, endTime, uid, sequence } = calendar;
  return buildCalendarLinks(date, startTime, endTime, uid, sequence);
}

export function sendBookingEmail({
  to,
  templateId,
  token,
  params,
  calendar,
  calendarLinks,
  cancelEvent,
}: SendBookingEmailOptions): SendBookingEmailResult {
  const links = ensureLinks(calendar, calendarLinks);
  const { cancelLink, rescheduleLink } = buildCancelRescheduleLinks(token);

  const attachments = [
    {
      name: calendar.fileName ?? 'booking.ics',
      content: Buffer.from(links.icsContent, 'utf8').toString('base64'),
      type: 'text/calendar',
    },
  ];

  let appleCalendarCancelLink: string | undefined;

  if (cancelEvent?.startTime && cancelEvent?.endTime) {
    const cancelIcs = buildIcsFile({
      title: cancelEvent.title ?? 'Harvest Pantry Booking',
      start: `${cancelEvent.date}T${cancelEvent.startTime}-06:00`,
      end: `${cancelEvent.date}T${cancelEvent.endTime}-06:00`,
      description:
        cancelEvent.description ?? 'Your booking at the Harvest Pantry',
      location: cancelEvent.location ?? 'Moose Jaw Food Bank',
      uid: calendar.uid,
      method: 'CANCEL',
      sequence: cancelEvent.sequence ?? 1,
    });
    const cancelFileName = cancelEvent.fileName ?? 'booking-cancel.ics';
    appleCalendarCancelLink = saveIcsFile(cancelFileName, cancelIcs);
    attachments.push({
      name: cancelFileName,
      content: Buffer.from(cancelIcs, 'utf8').toString('base64'),
      type: 'text/calendar',
    });
  }

  const payloadParams: Record<string, unknown> = {
    ...params,
    cancelLink,
    rescheduleLink,
    googleCalendarLink: links.googleCalendarLink,
    appleCalendarLink: links.appleCalendarLink,
  };

  if (appleCalendarCancelLink) {
    payloadParams.appleCalendarCancelLink = appleCalendarCancelLink;
  }

  enqueueEmail({ to, templateId, params: payloadParams, attachments });

  return {
    googleCalendarLink: links.googleCalendarLink,
    appleCalendarLink: links.appleCalendarLink,
    appleCalendarCancelLink,
  };
}
