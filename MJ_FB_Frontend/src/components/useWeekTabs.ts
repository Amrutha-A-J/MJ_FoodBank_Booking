import { useMemo, useState, type ReactNode } from 'react';
import { startOfWeek, getWeekDates, toDate, formatLocaleDate } from '../utils/date';
import type { TabItem } from './StyledTabs';

export function useWeekTabs() {
  const weekDates = useMemo(() => getWeekDates(toDate()), []);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek(toDate());
    const today = toDate();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const selectedDate = weekDates[tab];
  const getTabs = (render: (date: Date) => ReactNode): TabItem[] =>
    weekDates.map(d => ({ label: formatLocaleDate(d, { weekday: 'short' }), content: render(d) }));
  return { tab, setTab, selectedDate, weekDates, getTabs };
}
