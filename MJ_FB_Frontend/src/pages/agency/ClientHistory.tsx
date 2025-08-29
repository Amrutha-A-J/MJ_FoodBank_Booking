import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getBookingHistory } from '../../api/bookings';
import { getMyAgencyClients } from '../../api/agencies';
import { formatTime } from '../../utils/time';
import { formatDate, toDate } from '../../utils/date';
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
import Page from '../../components/Page';

interface Booking {
  id: number;
  status: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  slot_id: number | null;
  is_staff_booking: boolean;
  reason?: string;
  reschedule_token: string | null;
  client_id?: number;
  clientId?: number;
  client_name?: string;
  clientName?: string;
}

export default function ClientHistory() {
  const [clients, setClients] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState('approved');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(
    null,
  );

  const limit = 10;

  useEffect(() => {
    getMyAgencyClients()
      .then(data => {
        const mapped: Record<number, string> = {};
        (Array.isArray(data) ? data : []).forEach((c: any) => {
          const id = c.id ?? c.client_id;
          const name =
            c.name ||
            c.client_name ||
            `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
          if (id) mapped[id] = name || String(id);
        });
        setClients(mapped);
      })
      .catch(() => setClients({}));
  }, []);

  const clientIds = useMemo(
    () => Object.keys(clients).map(id => Number(id)),
    [clients],
  );

  const loadMore = useCallback(async () => {
    if (loading || !clientIds.length || !hasMore) return;
    setLoading(true);
    try {
      const data = await getBookingHistory({
        clientIds,
        status: filter === 'all' ? undefined : filter,
        limit,
        offset,
      });
      const arr = Array.isArray(data) ? data : [data];
      setBookings(prev => [...prev, ...arr]);
      setOffset(o => o + arr.length);
      if (arr.length < limit) setHasMore(false);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [clientIds, filter, offset, hasMore, loading]);

  useEffect(() => {
    setBookings([]);
    setOffset(0);
    setHasMore(true);
  }, [filter, clientIds]);

  useEffect(() => {
    if (clientIds.length) loadMore();
  }, [clientIds, filter]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

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
          <FormControl size="small" sx={{ minWidth: 160, mb: 1 }}>
            <InputLabel id="filter-label">Status</InputLabel>
            <Select
              labelId="filter-label"
              value={filter}
              label="Status"
              onChange={e => setFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="visited">Visited</MenuItem>
              <MenuItem value="no_show">No Show</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={cellSx}>Client</TableCell>
                  <TableCell sx={cellSx}>Date</TableCell>
                  <TableCell sx={cellSx}>Time</TableCell>
                  <TableCell sx={cellSx}>Status</TableCell>
                  <TableCell sx={cellSx}>Reason</TableCell>
                  <TableCell sx={cellSx}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.length === 0 && !hasMore && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center' }}>
                      No bookings.
                    </TableCell>
                  </TableRow>
                )}
                {bookings.map(b => {
                  const startTime = b.start_time ? formatTime(b.start_time) : 'N/A';
                  const endTime = b.end_time ? formatTime(b.end_time) : 'N/A';
                  const formattedDate =
                    b.date && !isNaN(toDate(b.date).getTime())
                      ? formatDate(b.date, 'MMM D, YYYY')
                      : 'N/A';
                  const name =
                    b.client_name ||
                    b.clientName ||
                    clients[b.client_id ?? b.clientId ?? 0] ||
                    '';
                  return (
                    <TableRow key={b.id}>
                      <TableCell sx={cellSx}>{name}</TableCell>
                      <TableCell sx={cellSx}>{formattedDate}</TableCell>
                      <TableCell sx={cellSx}>
                        {startTime !== 'N/A' && endTime !== 'N/A'
                          ? `${startTime} - ${endTime}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell sx={cellSx}>{b.status}</TableCell>
                      <TableCell sx={cellSx}>{b.reason || ''}</TableCell>
                      <TableCell sx={cellSx}>
                        {['approved'].includes(b.status.toLowerCase()) && (
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
          {hasMore && (
            <Box textAlign="center" mt={2}>
              <Button
                onClick={() => loadMore()}
                disabled={loading}
                variant="outlined"
                color="primary"
              >
                Load more
              </Button>
            </Box>
          )}
          <div ref={loadMoreRef} />
          {rescheduleBooking && (
            <RescheduleDialog
              open={!!rescheduleBooking}
              rescheduleToken={rescheduleBooking.reschedule_token || ''}
              onClose={() => setRescheduleBooking(null)}
              onRescheduled={() => {
                setBookings([]);
                setOffset(0);
                setHasMore(true);
                loadMore();
              }}
            />
          )}
        </Box>
      </Box>
    </Page>
  );
}

