import type { ConfigType } from 'dayjs';
import dayjs, { formatDate, toDayjs } from './date';

export interface WeekRange {
  week: number;
  startDate: string;
  endDate: string;
}

export function getWeekRanges(year: number, month: number): WeekRange[] {
  const startOfMonth = dayjs({ year, month, day: 1 });
  const endOfMonth = startOfMonth.endOf('month');
  const dayOfWeek = startOfMonth.day();
  const diff = (dayOfWeek + 6) % 7; // days to subtract to reach Monday
  let current = startOfMonth.subtract(diff, 'day');

  const ranges: WeekRange[] = [];
  let week = 1;

  while (current.isBefore(endOfMonth) || current.isSame(endOfMonth, 'day')) {
    const start = current.isBefore(startOfMonth) ? startOfMonth : current;
    const endCandidate = current.add(6, 'day');
    const end = endCandidate.isAfter(endOfMonth) ? endOfMonth : endCandidate;
    ranges.push({
      week,
      startDate: formatDate(start),
      endDate: formatDate(end),
    });
    week += 1;
    current = current.add(7, 'day');
  }

  return ranges;
}

export function getWeekForDate(date: ConfigType) {
  const d = toDayjs(date);
  const year = d.year();
  const month = d.month();
  const dateStr = formatDate(d);
  const ranges = getWeekRanges(year, month);
  const range = ranges.find(r => dateStr >= r.startDate && dateStr <= r.endDate);
  if (!range) {
    throw new Error('Date out of range');
  }
  return { year, month, week: range.week, startDate: range.startDate, endDate: range.endDate };
}
