import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

export const REGINA_TIMEZONE = 'America/Regina';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault(REGINA_TIMEZONE);

export function formatReginaDate(date: dayjs.ConfigType): string {
  return dayjs(date).tz(REGINA_TIMEZONE).format('YYYY-MM-DD');
}

export function formatReginaDateTime(date: dayjs.ConfigType): string {
  return dayjs(date).tz(REGINA_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
}

export function reginaStartOfDay(date?: dayjs.ConfigType): dayjs.Dayjs {
  return dayjs(date).tz(REGINA_TIMEZONE).startOf('day');
}

export default dayjs;
