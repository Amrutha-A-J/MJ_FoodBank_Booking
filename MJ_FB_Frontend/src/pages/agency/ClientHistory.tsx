import { useState, useEffect, useCallback, ReactNode } from 'react';
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
  TableContainer,
  Stack,
  Typography,
} from '@mui/material';
import RescheduleDialog from '../../components/RescheduleDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import EntitySearch from '../../components/EntitySearch';
import { toDate } from '../../utils/date';
import { formatDate } from '../../utils/date';
import Page from '../../components/Page';
import { useTranslation } from 'react-i18next';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ResponsiveTable from '../../components/ResponsiveTable';
import type { Booking } from '../../types';

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
  const [cancelBookingItem, setCancelBookingItem] = useState<Booking | null>(
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
        const arr = Array.isArray(data) ? data : [data];
        const sorted = arr.sort(
          (a, b) => toDate(b.date).getTime() - toDate(a.date).getTime(),
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

  const columns: {
    field: keyof Booking & string;
    header: string;
    render?: (row: Booking) => ReactNode;
  }[] = [
    {
      field: 'date',
      header: t('date'),
      render: b =>
        b.date && !isNaN(toDate(b.date).getTime())
          ? formatDate(b.date, 'MMM D, YYYY')
          : 'N/A',
    },
    {
      field: 'start_time',
      header: t('time'),
      render: b => {
        const startTime = b.start_time ? formatTime(b.start_time) : 'N/A';
        const endTime = b.end_time ? formatTime(b.end_time) : 'N/A';
        return startTime !== 'N/A' && endTime !== 'N/A'
          ? `${startTime} - ${endTime}`
          : 'N/A';
      },
    },
    {
      field: 'status',
      header: t('status'),
      render: b => t(b.status),
    },
    {
      field: 'reason',
      header: t('reason'),
      render: b => b.reason || '',
    },
    {
      field: 'staff_note',
      header: t('staff_note_label'),
      render: b =>
        b.staff_note ? (
          <Typography variant="body2">{b.staff_note}</Typography>
        ) : (
          ''
        ),
    },
    {
      field: 'id',
      header: t('actions'),
      render: b =>
        ['approved'].includes(b.status.toLowerCase()) && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Button
              onClick={() => setRescheduleBooking(b)}
              variant="outlined"
              color="primary"
            >
              {t('reschedule')}
            </Button>
            <Button
              onClick={() => setCancelBookingItem(b)}
              variant="outlined"
              color="error"
            >
              {t('cancel')}
            </Button>
          </Stack>
        ),
    },
  ];

  const handleCancel = async () => {
    if (!cancelBookingItem) return;
    try {
      await cancelBooking(String(cancelBookingItem.id));
      setSnackbar({ message: t('booking_cancelled'), severity: 'success' });
      loadBookings();
    } catch (err: any) {
      setSnackbar({
        message: err.message || t('cancel_booking_failed'),
        severity: 'error',
      });
    }
    setCancelBookingItem(null);
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
            <FormControl sx={{ minWidth: 160, mb: 1 }}>
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
            {paginated.length === 0 ? (
              <Typography align="center">{t('no_bookings')}</Typography>
            ) : (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <ResponsiveTable
                  columns={columns}
                  rows={paginated}
                  getRowKey={b => `${b.id}-${b.date}`}
                />
              </TableContainer>
            )}
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
            rescheduleToken={rescheduleBooking.reschedule_token!}
            onClose={() => setRescheduleBooking(null)}
            onRescheduled={() => {
              loadBookings();
            }}
          />
        )}
        {cancelBookingItem && (
          <ConfirmDialog
            message={t('cancel_booking_question')}
            onConfirm={handleCancel}
            onCancel={() => setCancelBookingItem(null)}
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

