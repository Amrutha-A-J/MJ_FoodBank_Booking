const REGINA_TZ = 'America/Regina';
const REGINA_OFFSET = '-06:00';

function toReginaDate(date: string | Date): Date {
  if (typeof date === 'string') {
    // If no time component is provided, treat the string as a Regina local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(`${date}T00:00:00${REGINA_OFFSET}`);
    }
    return new Date(date);
  }
  return date;
}

export function formatReginaDate(date: string | Date): string {
  const d = toReginaDate(date);
  return new Intl.DateTimeFormat('en-CA', { timeZone: REGINA_TZ }).format(d);
}

export function formatReginaDateWithDay(date: string | Date): string {
  const d = toReginaDate(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REGINA_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatReginaDateTime(date: string | Date): string {
  const d = toReginaDate(date);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: REGINA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

export function formatTimeToAmPm(time: string): string {
  const [hourStr, minute] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

export function reginaStartOfDayISO(date: string | Date): string {
  const d = toReginaDate(date);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REGINA_TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(d);
  const offset =
    parts.find(p => p.type === 'timeZoneName')?.value.replace('GMT', '') ||
    REGINA_OFFSET;
  return `${formatReginaDate(d)}T00:00:00${offset}`;
}
