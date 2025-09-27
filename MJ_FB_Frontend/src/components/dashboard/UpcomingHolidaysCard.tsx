import { useMemo } from 'react';
import { List, ListItem, ListItemText, type SxProps, type Theme } from '@mui/material';
import HolidayVillage from '@mui/icons-material/HolidayVillage';
import SectionCard from './SectionCard';
import useHolidays from '../../hooks/useHolidays';
import { reginaStartOfDay, toDayjs } from '../../utils/date';

interface UpcomingHolidaysCardProps {
  limit?: number;
  sx?: SxProps<Theme>;
}

export interface UpcomingHolidayItem {
  key: string;
  label: string;
}

export function useUpcomingHolidays(limit?: number): UpcomingHolidayItem[] {
  const { holidays } = useHolidays();

  return useMemo(() => {
    const start = reginaStartOfDay();
    const end = reginaStartOfDay().add(30, 'day').endOf('day');

    const filtered = holidays
      .map(holiday => ({
        ...holiday,
        date: toDayjs(holiday.date),
        originalDate: holiday.date,
      }))
      .filter(({ date }) => date.isValid() && !date.isBefore(start) && !date.isAfter(end))
      .sort((a, b) => a.date.valueOf() - b.date.valueOf());

    const limited = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;

    return limited.map(({ date, reason, originalDate }, index) => ({
      key: `${originalDate ?? date.format('YYYY-MM-DD')}-${index}`,
      label: `${date.format('MMM D (ddd)')} – ${reason?.trim() || 'Holiday'}`,
    }));
  }, [holidays, limit]);
}

export default function UpcomingHolidaysCard({ limit, sx }: UpcomingHolidaysCardProps) {
  const upcomingHolidays = useUpcomingHolidays(limit);

  if (!upcomingHolidays.length) {
    return null;
  }

  return (
    <SectionCard
      title="Upcoming Holidays"
      icon={<HolidayVillage color="primary" />}
      sx={sx}
    >
      <List>
        {upcomingHolidays.map(holiday => (
          <ListItem key={holiday.key}>
            <ListItemText primary={holiday.label} />
          </ListItem>
        ))}
      </List>
    </SectionCard>
  );
}
