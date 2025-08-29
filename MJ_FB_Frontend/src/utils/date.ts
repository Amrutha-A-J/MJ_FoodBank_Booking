
import dayjs, { ConfigType } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const REGINA_TIMEZONE = 'America/Regina';

dayjs.tz.setDefault(REGINA_TIMEZONE);

export function toDayjs(input?: ConfigType) {
  return dayjs.tz(input);
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

export function formatReginaDate(date: ConfigType): string {
  return toDayjs(date).format('YYYY-MM-DD');
}

export function formatReginaDateTime(date: ConfigType): string {
  return toDayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export function reginaStartOfDay(date?: ConfigType): dayjs.Dayjs {
  return toDayjs(date).startOf('day');
}

export default dayjs;
