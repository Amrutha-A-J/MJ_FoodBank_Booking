import { useState, useEffect, useCallback } from 'react';
import { getBookingHistory } from '../../api/bookings';
import { formatTime } from '../../utils/time';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RescheduleDialog from '../../components/RescheduleDialog';
import EntitySearch from '../../components/EntitySearch';
import { toDate } from '../../utils/date';
import { formatDate } from '../../utils/date';
import Page from '../../components/Page';

const TIMEZONE = 'America/Regina';

interface User {
  id: number;
  name: string;
  client_id: number;
}

interface Booking {
  id: number;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  slot_id: number;
  is_staff_booking: boolean;
  reason?: string;
  reschedule_token: string;
}

export default function ClientHistory() {
  const [selected, setSelected] = useState<User | null>(null);
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(
    null,
  );

  const pageSize = 10;

  const loadBookings = useCallback(() => {
    if (!selected) return Promise.resolve();
    const opts: { status?: string; past?: boolean; userId?: number } = {
      userId: selected.id,
    };
    if (filter === 'past') opts.past = true;
    else if (filter !== 'all') opts.status = filter;
    return getBookingHistory(opts)
      .then(data => {
        const sorted = [...data].sort(
          (a, b) =>
          toDate(b.created_at).getTime() -
            toDate(a.created_at).getTime(),
        );
        setBookings(sorted);
        setPage(1);
      })
      .catch(() => {});
  }, [selected, filter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const totalPages = Math.max(1, Math.ceil(bookings.length / pageSize));
  const paginated = bookings.slice((page - 1) * pageSize, page * pageSize);

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const cellSx = {
    border: 1,
    borderColor: 'divider',
    p: isSmall ? 0.5 : 1,
    fontSize: isSmall ? '0.85rem' : undefined,
    textAlign: 'left',
  } as const;

  return (
    <Page title="Client History">
      <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
        <Box width="100%" maxWidth={800} mt={4}>
        <EntitySearch
          type="user"
          placeholder="Search by name or client ID"
          onSelect={u => setSelected(u as User)}
        />
        {selected && (
          <div>
            {selected.name && <h3>History for {selected.name}</h3>}
            <FormControl size="small" sx={{ minWidth: 160, mb: 1 }}>
              <InputLabel id="filter-label">Filter</InputLabel>
              <Select
                labelId="filter-label"
                value={filter}
                label="Filter"
                onChange={e => setFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="past">Past</MenuItem>
              </Select>
            </FormControl>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={cellSx}>Date</TableCell>
                    <TableCell sx={cellSx}>Time</TableCell>
                    <TableCell sx={cellSx}>Status</TableCell>
                    <TableCell sx={cellSx}>Reason</TableCell>
                    <TableCell sx={cellSx}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center' }}>
                        No bookings.
                      </TableCell>
                    </TableRow>
                  )}
                  {paginated.map(b => {
                    const startTime = b.start_time ? formatTime(b.start_time) : 'N/A';
                    const endTime = b.end_time ? formatTime(b.end_time) : 'N/A';
                    const formattedDate =
                      b.date && !isNaN(toDate(b.date).getTime())
                        ? formatDate(b.date, 'MMM D, YYYY')
                        : 'N/A';
                    return (
                      <TableRow key={b.id}>
                        <TableCell sx={cellSx}>{formattedDate}</TableCell>
                        <TableCell sx={cellSx}>
                          {startTime !== 'N/A' && endTime !== 'N/A'
                            ? `${startTime} - ${endTime}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell sx={cellSx}>{b.status}</TableCell>
                        <TableCell sx={cellSx}>{b.reason || ''}</TableCell>
                        <TableCell sx={cellSx}>
                          {['approved', 'submitted'].includes(
                            b.status.toLowerCase(),
                          ) && (
                            <Button
                              onClick={() => setRescheduleBooking(b)}
                              variant="outlined"
                              color="primary"
                            >
                              Reschedule
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {totalPages > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1,
                  mt: 1,
                }}
              >
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  variant="outlined"
                  color="primary"
                >
                  Previous
                </Button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  variant="outlined"
                  color="primary"
                >
                  Next
                </Button>
              </Box>
            )}
          </div>
        )}
        {rescheduleBooking && (
          <RescheduleDialog
            open={!!rescheduleBooking}
            rescheduleToken={rescheduleBooking.reschedule_token}
            onClose={() => setRescheduleBooking(null)}
            onRescheduled={() => {
              loadBookings();
            }}
          />
        )}
      </Box>
    </Box>
    </Page>
  );
}

