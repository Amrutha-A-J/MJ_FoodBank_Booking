import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Typography,
  FormControlLabel,
  Checkbox,
  Stack,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import RescheduleDialog from './RescheduleDialog';
import DialogCloseButton from './DialogCloseButton';
import FeedbackSnackbar from './FeedbackSnackbar';
import BookingHistoryTable from './BookingHistoryTable';
import getApiErrorMessage from '../utils/getApiErrorMessage';
import { formatReginaDate, toDayjs, toDate } from '../utils/date';
import { formatTime } from '../utils/time';
import type { Booking, Slot } from '../types';
import FormDialog from './FormDialog';

interface User {
  name?: string;
  client_id: number;
}

interface RenderEditDialogArgs {
  open: boolean;
  onClose: () => void;
  user: User;
  onUpdated: (message: string, severity: AlertColor) => void;
}

interface BookingManagementBaseProps {
  user: User;
  getBookingHistory: (
    opts: Record<string, unknown>,
  ) => Promise<Booking[] | Booking>;
  cancelBooking: (id: string) => Promise<unknown>;
  rescheduleBookingByToken: (
    token: string,
    slotId: string,
    date: string,
  ) => Promise<unknown>;
  getSlots: (date: string) => Promise<Slot[]>;
  onDeleteVisit?: (id: number) => Promise<unknown>;
  renderEditDialog?: (args: RenderEditDialogArgs) => React.ReactNode;
  renderDeleteVisitButton?: (
    booking: Booking,
    isSmall: boolean,
    open: () => void,
  ) => React.ReactNode;
  showNotes?: boolean;
  showFilter?: boolean;
  showUserHeading?: boolean;
  retentionNotice?: React.ReactNode;
}

export default function BookingManagementBase({
  user,
  getBookingHistory,
  cancelBooking,
  rescheduleBookingByToken,
  getSlots,
  onDeleteVisit,
  renderEditDialog,
  renderDeleteVisitButton,
  showNotes,
  showFilter = true,
  showUserHeading = true,
  retentionNotice,
}: BookingManagementBaseProps) {
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(
    null,
  );
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const [editOpen, setEditOpen] = useState(false);
  const [notesOnly, setNotesOnly] = useState(false);

  const pageSize = 10;

  const loadBookings = useCallback(() => {
    const opts: Record<string, unknown> = {
      includeVisits: true,
      userId: user.client_id,
    };
    if (showNotes) opts.includeStaffNotes = true;
    if (filter === 'past') opts.past = true;
    else if (filter !== 'all') opts.status = filter;
    return getBookingHistory(opts)
      .then(data => {
        const arr = Array.isArray(data) ? [...data] : [data];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const active = arr
          .filter(
            b =>
              b.status === 'approved' &&
              toDate(b.date).getTime() >= today.getTime(),
          )
          .sort(
            (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime(),
          )[0];
        const remaining = active ? arr.filter(b => b !== active) : arr;
        const sorted = remaining.sort(
          (a, b) => toDate(b.date).getTime() - toDate(a.date).getTime(),
        );
        const ordered = active ? [active, ...sorted] : sorted;
        setBookings(ordered);
        setPage(1);
      })
      .catch(err => {
        setSeverity('error');
        setMessage(
          getApiErrorMessage(err, 'Failed to load booking history'),
        );
      });
  }, [user, filter, showNotes, getBookingHistory]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filtered = notesOnly
    ? bookings.filter(
        b => b.status === 'visited' && (b.client_note || b.staff_note),
      )
    : bookings;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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
      setSeverity('success');
      setMessage('Booking rescheduled');
      loadBookings();
    } catch (err: any) {
      setSeverity('error');
      setMessage(err.message || 'Failed to reschedule booking');
    } finally {
      setRescheduleBooking(null);
    }
  }

  const handleEditDialogUpdated = useCallback((m: string, s: AlertColor) => {
    setSeverity(s);
    setMessage(m);
  }, []);

  const handleEditDialogClose = useCallback(() => {
    setEditOpen(false);
  }, []);

  async function confirmCancel() {
    if (cancelId == null) return;
    try {
      await cancelBooking(String(cancelId));
      setSeverity('success');
      setMessage('Booking cancelled');
      loadBookings();
    } catch (err: unknown) {
      setSeverity('error');
      setMessage(getApiErrorMessage(err, 'Failed to cancel booking'));
    } finally {
      setCancelId(null);
    }
  }

  async function confirmDeleteVisit() {
    if (deleteVisitId == null || !onDeleteVisit) return;
    try {
      await onDeleteVisit(deleteVisitId);
      setSeverity('success');
      setMessage('Visit deleted');
      loadBookings();
    } catch (err: unknown) {
      setSeverity('error');
      setMessage(getApiErrorMessage(err, 'Unable to delete visit'));
    } finally {
      setDeleteVisitId(null);
    }
  }

  return (
    <div>
      <Box>
        {((showUserHeading && user.name) || renderEditDialog) && (
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            {showUserHeading && user.name && (
              <h3>{`History for ${user.name}`}</h3>
            )}
            {renderEditDialog && (
              <Button
                variant="contained"
                onClick={() => setEditOpen(true)}
              >
                Edit Client
              </Button>
            )}
          </Stack>
        )}
        {showFilter && (
          <FormControl sx={{ minWidth: 160, mb: 1 }}>
            <InputLabel id="filter-label">Filter</InputLabel>
            <Select
              labelId="filter-label"
              value={filter}
              label="Filter"
              onChange={e => setFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="visited">Visited</MenuItem>
              <MenuItem value="no_show">No show</MenuItem>
              <MenuItem value="past">Past</MenuItem>
            </Select>
          </FormControl>
        )}
        {showNotes && (
          <FormControlLabel
            control={
              <Checkbox
                checked={notesOnly}
                onChange={e => setNotesOnly(e.target.checked)}
              />
            }
            label="Visits with notes only"
          />
        )}
        {paginated.length === 0 ? (
          <Typography align="center">No bookings</Typography>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <BookingHistoryTable
              rows={paginated}
              showReason
              showStaffNotes={showNotes}
              onCancel={b => setCancelId(b.id)}
              onReschedule={b => setRescheduleBooking(b)}
              renderExtraActions={
                renderDeleteVisitButton
                  ? (b, isSmall) =>
                      renderDeleteVisitButton(b, isSmall, () =>
                        setDeleteVisitId(b.id),
                      )
                  : undefined
              }
              getRowKey={b => `${b.id}-${b.date}`}
            />
          </TableContainer>
        )}
        {retentionNotice && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {retentionNotice}
          </Typography>
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outlined"
            >
              Prev
            </Button>
            <Typography>{page}</Typography>
            <Button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outlined"
            >
              Next
            </Button>
          </Box>
        )}
      </Box>
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
      {renderEditDialog &&
        renderEditDialog({
          open: editOpen,
          onClose: handleEditDialogClose,
          user,
          onUpdated: handleEditDialogUpdated,
        })}
      <FormDialog open={cancelId !== null} onClose={() => setCancelId(null)} maxWidth="xs">
        <DialogCloseButton onClose={() => setCancelId(null)} />
        <DialogTitle>Cancel booking</DialogTitle>
        <DialogContent>
          <Typography>Cancel this booking?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="contained"
            onClick={confirmCancel}
          >
            Cancel booking
          </Button>
        </DialogActions>
      </FormDialog>
      {onDeleteVisit && (
        <FormDialog
          open={deleteVisitId !== null}
          onClose={() => setDeleteVisitId(null)}
          maxWidth="xs"
        >
          <DialogCloseButton onClose={() => setDeleteVisitId(null)} />
          <DialogTitle>Delete visit</DialogTitle>
          <DialogContent>
            <Typography>Delete this visit?</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              color="error"
              variant="contained"
              onClick={confirmDeleteVisit}
            >
              Delete visit
            </Button>
          </DialogActions>
        </FormDialog>
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </div>
  );
}

