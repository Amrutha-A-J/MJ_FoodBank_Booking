import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBookings } from '../../../api/bookings';
import { formatDate, toDayjs } from '../../../utils/date';
import { formatTime } from '../../../utils/time';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import ManageBookingDialog from '../../../components/ManageBookingDialog';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import type { Booking } from '../../../types';

export default function NoShowWeek() {
  const [start] = useState(() => toDayjs().startOf('week'));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => start.add(i, 'day')), [start]);
  const today = useMemo(() => toDayjs(), []);

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
    if (dateStr !== formatDate(today)) {
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

  return (
    <Box>
      {days.map(d => {
        const dateStr = formatDate(d);
        const list = filtered(dateStr);
        return (
          <Box key={dateStr} mb={3}>
            <Stack direction="row" spacing={2} alignItems="center" mb={1}>
              <Typography variant="h6">
                {formatDate(d, 'dddd, MMM D, YYYY')}
              </Typography>
              {dateStr === formatDate(today) && (
                <FormControl size="small">
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
              <TableContainer>
                <Table
                  size="small"
                  data-testid={
                    dateStr === formatDate(today) ? 'today-bookings' : undefined
                  }
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {list.map(b => (
                      <TableRow
                        key={b.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => setManageBooking(b)}
                      >
                        <TableCell>{formatTime(b.start_time)}</TableCell>
                        <TableCell>{b.user_name}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>
                          {b.status.replace('_', ' ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        );
      })}
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

