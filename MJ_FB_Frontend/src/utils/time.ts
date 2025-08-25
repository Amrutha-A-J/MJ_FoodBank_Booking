import { formatInTimeZone } from 'date-fns-tz';

export const REGINA_TIMEZONE = 'America/Regina';

export function formatTime(time: string): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  let hour = parseInt(hStr, 10);
  const minute = mStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

export function formatHHMM(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

export function formatReginaDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'en-CA',
): string {
  return date.toLocaleDateString(locale, { timeZone: REGINA_TIMEZONE, ...options });
}

export function formatRegina(date: Date, fmt: string): string {
  return formatInTimeZone(date, REGINA_TIMEZONE, fmt);
}

