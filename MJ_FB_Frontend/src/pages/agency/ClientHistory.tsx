import { useState, useEffect, useCallback } from 'react';
import { getBookingHistory, cancelBooking } from '../../api/bookings';
import { getMyAgencyClients } from '../../api/agencies';
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
  Stack,
  Typography,
} from '@mui/material';
import RescheduleDialog from '../../components/RescheduleDialog';
import EntitySearch from '../../components/EntitySearch';
import { toDate } from '../../utils/date';
import { formatDate } from '../../utils/date';
import Page from '../../components/Page';
import { useTranslation } from 'react-i18next';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import type { Booking } from '../../types';

const TIMEZONE = 'America/Regina';

interface User {
  name: string;
  client_id: number;
}

export default function ClientHistory() {
  const [selected, setSelected] = useState<User | null>(null);
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(
    null,
  );
  const [clients, setClients] = useState<User[]>([]);
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: 'success' | 'error' } | null
  >(null);
  const { t } = useTranslation();

  const pageSize = 10;

  useEffect(() => {
    getMyAgencyClients()
      .then(data => {
        const mapped = Array.isArray(data)
          ? data.map((c: any) => ({
              client_id: c.client_id,
              name:
                c.name ??
                c.client_name ??
                `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
            }))
          : [];
        setClients(mapped);
      })
      .catch(() => setClients([]));
  }, []);

  const searchAgencyClients = useCallback(
    async (term: string) => {
      const lower = term.toLowerCase();
      return clients.filter(
        c =>
          c.name.toLowerCase().includes(lower) ||
          c.client_id.toString().includes(term),
      );
    },
    [clients],
  );

  const loadBookings = useCallback(() => {
    if (!selected) return Promise.resolve();
    const opts: {
      status?: string;
      past?: boolean;
      userId?: number;
      includeVisits?: boolean;
      includeStaffNotes?: boolean;
    } = {
      userId: selected.client_id,
      includeVisits: true,
      includeStaffNotes: true,
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

  const handleCancel = async (b: Booking) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await cancelBooking(String(b.id));
      setSnackbar({ message: 'Booking cancelled', severity: 'success' });
      loadBookings();
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to cancel booking',
        severity: 'error',
      });
    }
  };

  return (
    <Page title={t('client_history')}>
      <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
        <Box width="100%" maxWidth={800} mt={4}>
        <EntitySearch
          type="user"
          placeholder={t('search_by_name_or_client_id')}
          onSelect={u => setSelected(u as User)}
          searchFn={searchAgencyClients}
        />
        {selected && (
          <div>
            {selected.name && <h3>{t('history_for', { name: selected.name })}</h3>}
            <FormControl size="small" sx={{ minWidth: 160, mb: 1 }}>
              <InputLabel id="filter-label">{t('filter')}</InputLabel>
              <Select
                labelId="filter-label"
                value={filter}
                label={t('filter')}
                onChange={e => setFilter(e.target.value)}
              >
                <MenuItem value="all">{t('all')}</MenuItem>
                <MenuItem value="approved">{t('approved')}</MenuItem>
                <MenuItem value="past">{t('past')}</MenuItem>
              </Select>
            </FormControl>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={cellSx}>{t('date')}</TableCell>
                    <TableCell sx={cellSx}>{t('time')}</TableCell>
                    <TableCell sx={cellSx}>{t('status')}</TableCell>
                    <TableCell sx={cellSx}>{t('reason')}</TableCell>
                    <TableCell sx={cellSx}>{t('staff_note_label')}</TableCell>
                    <TableCell sx={cellSx}>{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center' }}>
                        {t('no_bookings')}
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
                      <TableRow key={`${b.id}-${b.created_at}`}>
                        <TableCell sx={cellSx}>{formattedDate}</TableCell>
                        <TableCell sx={cellSx}>
                          {startTime !== 'N/A' && endTime !== 'N/A'
                            ? `${startTime} - ${endTime}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell sx={cellSx}>{t(b.status)}</TableCell>
                        <TableCell sx={cellSx}>{b.reason || ''}</TableCell>
                        <TableCell sx={cellSx}>
                          {b.staff_note && (
                            <Typography variant="body2">{b.staff_note}</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={cellSx}>
                          {['approved'].includes(b.status.toLowerCase()) && (
                            <Stack direction="row" spacing={1}>
                              <Button
                                onClick={() => setRescheduleBooking(b)}
                                variant="outlined"
                                color="primary"
                              >
                                {t('reschedule')}
                              </Button>
                              <Button
                                onClick={() => handleCancel(b)}
                                variant="outlined"
                                color="error"
                              >
                                {t('cancel')}
                              </Button>
                            </Stack>
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
                  {t('previous')}
                </Button>
                <span>
                  {t('page_of_total', { page, total: totalPages })}
                </span>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  variant="outlined"
                  color="primary"
                >
                  {t('next')}
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
        <FeedbackSnackbar
          open={!!snackbar}
          onClose={() => setSnackbar(null)}
          message={snackbar?.message || ''}
          severity={snackbar?.severity}
        />
      </Box>
    </Box>
    </Page>
  );
}

