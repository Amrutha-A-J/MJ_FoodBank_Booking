interface CalendarEvent {
  title: string;
  start: Date | string;
  end: Date | string;
  description?: string;
  location?: string;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace(/[-:]|\.\d{3}/g, '');
}

export function buildGoogleCalendarLink({
  title,
  start,
  end,
  description,
  location,
}: CalendarEvent): string {
  const startStr = formatDate(start);
  const endStr = formatDate(end);

  const params = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(title)}`,
    `dates=${startStr}/${endStr}`,
    description ? `details=${encodeURIComponent(description)}` : '',
    location ? `location=${encodeURIComponent(location)}` : '',
  ]
    .filter(Boolean)
    .join('&');

  return `https://calendar.google.com/calendar/render?${params}`;
}

export function buildIcsFile({
  title,
  start,
  end,
  description,
  location,
}: CalendarEvent): string {
  const startStr = formatDate(start);
  const endStr = formatDate(end);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
  ];
  if (description) lines.push(`DESCRIPTION:${description}`);
  if (location) lines.push(`LOCATION:${location}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

export function buildCalendarLinks(booking: {
  date: string;
  start_time: string | null;
  end_time: string | null;
}): { google: string; ics: string } {
  if (!booking.start_time || !booking.end_time) {
    throw new Error('Booking missing start or end time');
  }

  const start = new Date(`${booking.date}T${booking.start_time}-06:00`);
  const end = new Date(`${booking.date}T${booking.end_time}-06:00`);
  const title = 'Moose Jaw Food Bank Booking';
  const description = 'Your booking at the Moose Jaw Food Bank';
  const location = 'Moose Jaw Food Bank';

  return {
    google: buildGoogleCalendarLink({ title, start, end, description, location }),
    ics: buildIcsFile({ title, start, end, description, location }),
  };
}

export default {
  buildGoogleCalendarLink,
  buildIcsFile,
  buildCalendarLinks,
};
