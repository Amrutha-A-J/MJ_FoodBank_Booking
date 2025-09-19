const REGINA_TZ = 'America/Regina';
const REGINA_OFFSET = '-06:00';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function toReginaDate(date: string | Date): Date {
  if (typeof date === 'string') {
    // If no time component is provided, treat the string as a Regina local date
    if (DATE_REGEX.test(date)) {
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

export function getWeekForDate(date: string | Date) {
  const d = toReginaDate(date);
  const year = d.getUTCFullYear();
  const monthIndex = d.getUTCMonth(); // 0-based
  const month = monthIndex + 1;

  // Determine week ranges for the month using Monday as the first day of the week
  const pad = (n: number) => n.toString().padStart(2, '0');
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const startOfMonth = toReginaDate(`${year}-${pad(month)}-01`);
  const endOfMonth = toReginaDate(`${year}-${pad(month)}-${pad(daysInMonth)}`);
  const dayOfWeek = startOfMonth.getUTCDay(); // 0=Sun..6=Sat
  const diff = (dayOfWeek + 6) % 7; // days to subtract to reach Monday
  let current = new Date(startOfMonth);
  current.setUTCDate(current.getUTCDate() - diff);

  let week = 1;
  while (current <= endOfMonth) {
    const start = current < startOfMonth ? startOfMonth : current;
    const endCandidate = new Date(current);
    endCandidate.setUTCDate(endCandidate.getUTCDate() + 6);
    const end = endCandidate > endOfMonth ? endOfMonth : endCandidate;

    if (d >= start && d <= end) {
      return {
        week,
        month,
        year,
        startDate: formatReginaDate(start),
        endDate: formatReginaDate(end),
      };
    }

    current.setUTCDate(current.getUTCDate() + 7);
    week += 1;
  }

  throw new Error('Date out of range');
}
