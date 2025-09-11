import { useMemo, useState } from 'react';
import { toDate, startOfWeek, getWeekDates } from '../utils/date';

export default function useWeekTabs() {
  const weekDates = useMemo(() => getWeekDates(), []);
  const [tab, setTab] = useState(() => {
    const week = startOfWeek();
    const today = toDate();
    return Math.floor((today.getTime() - week.getTime()) / (24 * 60 * 60 * 1000));
  });
  const selectedDate = weekDates[tab];
  return { weekDates, tab, setTab, selectedDate };
}
