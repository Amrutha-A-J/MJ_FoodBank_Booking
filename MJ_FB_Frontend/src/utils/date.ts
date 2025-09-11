
import dayjs from 'dayjs';
import type { ConfigType } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import objectSupport from 'dayjs/plugin/objectSupport';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(objectSupport);

export const REGINA_TIMEZONE = 'America/Regina';

dayjs.tz.setDefault(REGINA_TIMEZONE);

export function toDayjs(input?: ConfigType) {
  if (input === undefined || input === null || input === '') {
    return dayjs();
  }
  if (input instanceof Date) {
    const parsed = dayjs(input).tz(REGINA_TIMEZONE);
    return parsed.isValid() ? parsed : dayjs(NaN);
  }
  const isLocalString =
    typeof input === 'string' && !/([zZ]|[+-]\d{2}:?\d{2})$/.test(input);
  const parsed = dayjs(input).tz(REGINA_TIMEZONE, isLocalString);
  return parsed.isValid() ? parsed : dayjs(NaN);
}

export function toDate(input?: ConfigType) {
  return toDayjs(input).toDate();
}

export function formatDate(input?: ConfigType, fmt = 'YYYY-MM-DD') {
  return toDayjs(input).format(fmt);
}

export function formatLocaleDate(
  input?: ConfigType,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'en-CA',
) {
  return toDayjs(input).toDate().toLocaleDateString(locale, { timeZone: REGINA_TIMEZONE, ...options });
}

export function addDays(input: ConfigType, amount: number) {
  return toDayjs(input).add(amount, 'day').toDate();
}

export function startOfWeek(input?: ConfigType) {
  const d = toDate(input);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(input?: ConfigType) {
  const start = startOfWeek(input);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatReginaDate(date: ConfigType): string {
  return toDayjs(date).format('YYYY-MM-DD');
}

export function formatReginaDateTime(date: ConfigType): string {
  return toDayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export function reginaStartOfDay(date?: ConfigType): dayjs.Dayjs {
  return toDayjs(date).startOf('day');
}

export function normalizeDate(input?: ConfigType | null): string {
  if (!input) return '';
  if (typeof input === 'string') {
    return input.split('T')[0];
  }
  return toDayjs(input).format('YYYY-MM-DD');
}

export default dayjs;
