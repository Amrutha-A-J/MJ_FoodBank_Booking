import { useState, useEffect, useCallback } from 'react';
import {
  getBookingHistory,
  cancelBooking,
  getSlots,
  rescheduleBookingByToken,
} from '../../api/bookings';
import { getMyAgencyClients } from '../../api/agencies';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Typography,
} from '@mui/material';
import RescheduleDialog from '../../components/RescheduleDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import EntitySearch from '../../components/EntitySearch';
import { toDate, formatReginaDate, toDayjs } from '../../utils/date';
import { formatTime } from '../../utils/time';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import BookingHistoryTable from '../../components/BookingHistoryTable';
import type { Booking } from '../../types';
import type { ApiError } from '../../api/client';

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
  
  const pageSize = 10;

  useEffect(() => {
    getMyAgencyClients()
      .then(data => {
        interface AgencyClientData {
          client_id?: number;
          name?: string;
          client_name?: string;
          first_name?: string;
          last_name?: string;
        }
        const mapped = Array.isArray(data)
          ? data.map((c: AgencyClientData) => ({
              client_id: c.client_id!,
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

  const handleCancel = async () => {
    if (!cancelBookingItem) return;
    try {
      await cancelBooking(String(cancelBookingItem.id));
      setSnackbar({ message: "Booking cancelled", severity: 'success' });
      loadBookings();
    } catch (err: unknown) {
      const e = err as ApiError | undefined;
      setSnackbar({
        message: e?.message || "Failed to cancel booking",
        severity: 'error',
      });
    }
    setCancelBookingItem(null);
  };

  async function loadSlotOptions(date: string) {
    const todayStr = formatReginaDate(toDayjs());
    try {
      let slots = await getSlots(date);
      if (date === todayStr) {
        const now = toDayjs();
        slots = slots.filter(s =>
          toDayjs(`${date}T${s.startTime}`).isAfter(now),
        );
      }
      return slots
        .filter(
          s =>
            (s.available ?? 0) > 0 &&
            s.status !== 'blocked' &&
            s.status !== 'break',
        )
        .map(s => ({
          id: s.id,
          label: `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`,
        }));
    } catch {
      return [];
    }
  }

  async function handleReschedule(date: string, slotId: string) {
    if (!rescheduleBooking) return;
    try {
      await rescheduleBookingByToken(
        rescheduleBooking.reschedule_token!,
        slotId,
        date,
      );
      setSnackbar({ message: 'Booking rescheduled', severity: 'success' });
      await loadBookings();
    } catch (err: unknown) {
      const e = err as ApiError | undefined;
      setSnackbar({
        message: e?.message || 'Failed to reschedule booking',
        severity: 'error',
      });
    } finally {
      setRescheduleBooking(null);
    }
  }

  return (
    <Page title={"Client History"}>
      <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
        <Box width="100%" maxWidth={800} mt={4}>
        <EntitySearch
          type="user"
          placeholder={"Search by name or client ID"}
          onSelect={u => setSelected(u as User)}
          searchFn={searchAgencyClients}
        />
        {selected && (
          <div>
            {selected.name && <h3>{`History for ${selected.name}`}</h3>}
            <FormControl sx={{ minWidth: 160, mb: 1 }}>
              <InputLabel id="filter-label">{"Filter"}</InputLabel>
              <Select
                labelId="filter-label"
                value={filter}
                label={"Filter"}
                onChange={e => setFilter(e.target.value)}
              >
                <MenuItem value="all">{"All"}</MenuItem>
                <MenuItem value="approved">{"Approved"}</MenuItem>
                <MenuItem value="past">{"Past"}</MenuItem>
              </Select>
            </FormControl>
            {paginated.length === 0 ? (
              <Typography align="center">{"No bookings."}</Typography>
            ) : (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <BookingHistoryTable
                  rows={paginated}
                  showReason
                  showStaffNotes
                  onCancel={b => setCancelBookingItem(b)}
                  onReschedule={b => setRescheduleBooking(b)}
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
                  {"Previous"}
                </Button>
                <span>
                  {`Page ${page} of ${totalPages}`}
                </span>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  variant="outlined"
                  color="primary"
                >
                  {"Next"}
                </Button>
              </Box>
            )}
          </div>
        )}
        {rescheduleBooking && (
          <RescheduleDialog
            open={!!rescheduleBooking}
            onClose={() => setRescheduleBooking(null)}
            loadOptions={loadSlotOptions}
            onSubmit={handleReschedule}
            optionLabel="Time"
            submitLabel="Reschedule"
          />
        )}
        {cancelBookingItem && (
          <ConfirmDialog
            message={"Are you sure you want to cancel this booking?"}
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

