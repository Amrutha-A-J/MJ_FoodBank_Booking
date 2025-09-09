import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBookings } from '../../../api/bookings';
import { formatDate, toDayjs, REGINA_TIMEZONE } from '../../../utils/date';
import { formatTime } from '../../../utils/time';
import {
  Box,
  Typography,
  TableContainer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import ManageBookingDialog from '../../../components/ManageBookingDialog';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import StyledTabs from '../../../components/StyledTabs';
import type { Booking } from '../../../types';
import ResponsiveTable, { type Column } from '../../../components/ResponsiveTable';

export default function NoShowWeek() {
  const [start] = useState(() => toDayjs().tz(REGINA_TIMEZONE).startOf('week'));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => start.add(i, 'day')), [start]);
  const today = useMemo(() => toDayjs(), []);
  const todayStr = formatDate(today);
  const [tab, setTab] = useState(() => today.diff(start, 'day'));

  const [byDate, setByDate] = useState<Record<string, Booking[]>>({});
  const [filter, setFilter] = useState<'all' | 'approved' | 'no_show'>('all');
  const [manageBooking, setManageBooking] = useState<Booking | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: AlertColor } | null>(null);

  const loadWeek = useCallback(async () => {
    const results = await Promise.all(
      days.map(d => getBookings({ date: formatDate(d) }))
    );
    const map: Record<string, Booking[]> = {};
    results.forEach((res, idx) => {
      const arr = Array.isArray(res) ? res : [res];
      map[formatDate(days[idx])] = arr as Booking[];
    });
    setByDate(map);
  }, [days]);

  useEffect(() => {
    loadWeek().catch(() => {});
  }, [loadWeek]);

  function filtered(dateStr: string) {
    const list = byDate[dateStr] || [];
    if (dateStr !== todayStr) {
      return list.filter(b => b.status === 'no_show');
    }
    const now = toDayjs();
    const approvedPast = list.filter(
      b =>
        b.status === 'approved' &&
        b.start_time &&
        toDayjs(`${dateStr}T${b.start_time}`).isBefore(now),
    );
    const noShows = list.filter(b => b.status === 'no_show');
    if (filter === 'approved') return approvedPast;
    if (filter === 'no_show') return noShows;
    return [...approvedPast, ...noShows];
  }

  function handleUpdated(message: string, severity: AlertColor) {
    setSnackbar({ message, severity });
    loadWeek();
  }

  const columns: Column<Booking>[] = [
    {
      field: 'start_time',
      header: 'Time',
      render: b => (
        <Box sx={{ cursor: 'pointer' }} onClick={() => setManageBooking(b)}>
          {b.start_time ? formatTime(b.start_time) : ''}
        </Box>
      ),
    },
    {
      field: 'user_name',
      header: 'Client',
      render: b => (
        <Box sx={{ cursor: 'pointer' }} onClick={() => setManageBooking(b)}>
          {b.user_name}
        </Box>
      ),
    },
    {
      field: 'status',
      header: 'Status',
      render: b => (
        <Box
          sx={{ cursor: 'pointer', textTransform: 'capitalize' }}
          onClick={() => setManageBooking(b)}
        >
          {b.status.replace('_', ' ')}
        </Box>
      ),
    },
  ];

  const tabs = days.map(d => {
    const dateStr = formatDate(d);
    const list = filtered(dateStr);
    return {
      label: formatDate(d, 'ddd'),
      content: (
        <Box>
          <Stack direction="row" spacing={2} alignItems="center" mb={1}>
            <Typography variant="h6">
              {formatDate(d, 'dddd, MMM D, YYYY')}
            </Typography>
            {dateStr === todayStr && (
              <FormControl>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={filter}
                  onChange={e =>
                    setFilter(e.target.value as 'all' | 'approved' | 'no_show')
                  }
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="no_show">No Show</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
          {list.length === 0 ? (
            <Typography>No bookings</Typography>
          ) : (
            <TableContainer
              data-testid={
                dateStr === todayStr ? 'today-bookings' : undefined
              }
            >
              <ResponsiveTable
                columns={columns}
                rows={list}
                getRowKey={b => b.id}
              />
            </TableContainer>
          )}
        </Box>
      ),
    };
  });

  return (
    <Box>
      <StyledTabs tabs={tabs} value={tab} onChange={(_e, v) => setTab(v)} />
      {manageBooking && (
        <ManageBookingDialog
          open
          booking={manageBooking}
          onClose={() => setManageBooking(null)}
          onUpdated={handleUpdated}
        />
      )}
      <FeedbackSnackbar
        open={!!snackbar}
        message={snackbar?.message || ''}
        severity={snackbar?.severity || 'success'}
        onClose={() => setSnackbar(null)}
      />
    </Box>
  );
}

