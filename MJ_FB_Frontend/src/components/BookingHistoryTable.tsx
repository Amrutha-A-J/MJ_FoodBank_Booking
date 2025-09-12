import { Button, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import ResponsiveTable, { type Column } from './ResponsiveTable';
import { formatTime } from '../utils/time';
import { formatDate, toDate } from '../utils/date';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface BookingHistoryItem {
  id: number;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
  reason?: string | null;
  staff_note?: string | null;
  role_name?: string;
  recurring_id?: number | null;
  slot_id?: number | null;
}

interface Props<T extends BookingHistoryItem> {
  rows: T[];
  showRole?: boolean;
  showReason?: boolean;
  showStaffNotes?: boolean;
  onCancel?: (b: T) => void;
  onReschedule?: (b: T) => void;
  onCancelSeries?: (id: number) => void;
  renderExtraActions?: (b: T, isSmall: boolean) => ReactNode;
  getRowKey?: (row: T, index: number) => React.Key;
}

export default function BookingHistoryTable<T extends BookingHistoryItem>({
  rows,
  showRole,
  showReason,
  showStaffNotes,
  onCancel,
  onReschedule,
  onCancelSeries,
  renderExtraActions,
  getRowKey,
}: Props<T>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const columns: Column<T>[] = [];

  if (showRole) {
    columns.push({ field: 'role_name' as keyof T & string, header: t('role') });
  }

  columns.push({
    field: 'date',
    header: t('date'),
    render: b =>
      b.date && !isNaN(toDate(b.date).getTime())
        ? formatDate(b.date, 'MMM D, YYYY')
        : b.date,
  } as Column<T>);

  columns.push({
    field: 'time' as keyof T & string,
    header: t('time'),
    render: b => {
      const start = b.start_time ?? b.startTime;
      const end = b.end_time ?? b.endTime;
      const na = t('not_applicable');
      const startTime = start ? formatTime(start) : na;
      const endTime = end ? formatTime(end) : na;
      return start && end ? `${startTime} - ${endTime}` : na;
    },
  });

  columns.push({
    field: 'status',
    header: t('status'),
    render: b => t(b.status),
  } as Column<T>);

  if (showReason) {
    columns.push({
      field: 'reason' as keyof T & string,
      header: t('reason'),
      render: b => b.reason || '',
    });
  }

  if (showStaffNotes) {
    columns.push({
      field: 'staff_note' as keyof T & string,
      header: t('staff_note_label'),
      render: b =>
        b.staff_note ? (
          <Typography variant="body2">{b.staff_note}</Typography>
        ) : (
          ''
        ),
    });
  }

  if (onCancel || onReschedule || onCancelSeries || renderExtraActions) {
    columns.push({
      field: 'actions' as keyof T & string,
      header: t('actions'),
      render: b => {
        const items: ReactNode[] = [];
        const approved = b.status?.toLowerCase() === 'approved';
        if (approved && onCancel) {
          items.push(
            <Button
              key="cancel"
              onClick={() => onCancel(b)}
              variant="outlined"
              color="primary"
              fullWidth={isSmall}
            >
              {t('cancel')}
            </Button>,
          );
        }
        if (approved && onReschedule) {
          items.push(
            <Button
              key="reschedule"
              onClick={() => onReschedule(b)}
              variant="outlined"
              color="primary"
              fullWidth={isSmall}
            >
              {t('reschedule')}
            </Button>,
          );
        }
        if (approved && onCancelSeries && b.recurring_id) {
          items.push(
            <Button
              key="cancelSeries"
              onClick={() => onCancelSeries(b.recurring_id!)}
              variant="outlined"
              color="primary"
              fullWidth={isSmall}
            >
              {t('cancel_all_upcoming_short')}
            </Button>,
          );
        }
        if (renderExtraActions) {
          const extra = renderExtraActions(b, isSmall);
          if (extra) items.push(extra);
        }
        if (!items.length) return null;
        return isSmall ? (
          <Stack direction="column" spacing={1} sx={{ width: '100%' }}>
            {items}
          </Stack>
        ) : (
          <>{items}</>
        );
      },
    });
  }

  return (
    <ResponsiveTable columns={columns} rows={rows} getRowKey={getRowKey} />
  );
}

