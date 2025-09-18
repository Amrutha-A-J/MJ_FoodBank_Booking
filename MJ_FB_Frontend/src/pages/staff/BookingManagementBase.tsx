import { useState, useCallback, type ReactNode } from 'react';
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  TableContainer,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import EntitySearch from '../../components/EntitySearch';
import BookingHistoryTable, {
  type BookingHistoryItem,
} from '../../components/BookingHistoryTable';
import RescheduleDialog from '../../components/RescheduleDialog';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DialogCloseButton from '../../components/DialogCloseButton';
import FormDialog from '../../components/FormDialog';

interface Option {
  id: string;
  label: string;
}

export interface BookingManagementBaseProps<
  E extends { id: number | string; name: string },
  B extends BookingHistoryItem,
> {
  entitySearchType: 'user' | 'volunteer';
  loadBookings: (entity: E) => Promise<B[]>;
  cancelBooking: (id: number) => Promise<void>;
  rescheduleBooking: (
    booking: B,
    optionId: string,
    date: string,
  ) => Promise<void>;
  fetchRescheduleOptions: (date: string) => Promise<Option[]>;
  onEntitySelect?: (entity: E) => void;
  renderExtraActions?: (
    booking: B,
    reload: () => void,
    isSmall: boolean,
  ) => ReactNode;
  renderEntityDialog?: (
    entity: E,
    open: boolean,
    onClose: () => void,
    reload: () => void,
  ) => ReactNode;
  renderTable?: (
    rows: B[],
    defaultTable: ReactNode,
    reload: () => void,
    openEntityDialog: () => void,
  ) => ReactNode;
  placeholder?: string;
}

export default function BookingManagementBase<
  E extends { id: number | string; name: string },
  B extends BookingHistoryItem,
>({
  entitySearchType,
  loadBookings,
  cancelBooking,
  rescheduleBooking,
  fetchRescheduleOptions,
  onEntitySelect,
  renderExtraActions,
  renderEntityDialog,
  renderTable,
  placeholder,
}: BookingManagementBaseProps<E, B>) {
  const [selected, setSelected] = useState<E | null>(null);
  const [bookings, setBookings] = useState<B[]>([]);
  const [page, setPage] = useState(1);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [reschedule, setReschedule] = useState<B | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);

  const pageSize = 10;

  const reload = useCallback(() => {
    if (!selected) return;
    loadBookings(selected)
      .then(data => {
        setBookings(data);
        setPage(1);
      })
      .catch(err => {
        console.error(err);
        setSeverity('error');
        setMessage('Failed to load bookings');
      });
  }, [selected, loadBookings]);

  function handleSelect(entity: E) {
    setSelected(entity);
    onEntitySelect?.(entity);
    loadBookings(entity)
      .then(data => {
        setBookings(data);
        setPage(1);
      })
      .catch(err => {
        console.error(err);
        setSeverity('error');
        setMessage('Failed to load bookings');
      });
  }

  async function handleCancel() {
    if (cancelId == null) return;
    try {
      await cancelBooking(cancelId);
      setSeverity('success');
      setMessage('Booking cancelled');
      reload();
    } catch (err) {
      console.error(err);
      setSeverity('error');
      setMessage('Unable to cancel booking');
    } finally {
      setCancelId(null);
    }
  }

  async function handleReschedule(date: string, optionId: string) {
    if (!reschedule) return;
    try {
      await rescheduleBooking(reschedule, optionId, date);
      setSeverity('success');
      setMessage('Booking rescheduled');
      reload();
    } catch (err) {
      console.error(err);
      setSeverity('error');
      setMessage('Unable to reschedule booking');
    } finally {
      setReschedule(null);
    }
  }

  const paginated = bookings.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(bookings.length / pageSize));

  const table = (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <BookingHistoryTable
        rows={paginated}
        onCancel={b => setCancelId(b.id)}
        onReschedule={b => setReschedule(b)}
        renderExtraActions={
          renderExtraActions
            ? (b, isSmall) => renderExtraActions(b, reload, isSmall)
            : undefined
        }
        getRowKey={b => `${b.id}-${b.date}`}
      />
    </TableContainer>
  );

  return (
    <Box>
      <EntitySearch<E>
        type={entitySearchType}
        placeholder={placeholder}
        onSelect={handleSelect}
      />
      {selected && (
        <Box mt={2}>
          {renderTable
            ? renderTable(
                paginated,
                table,
                reload,
                () => setEntityDialogOpen(true),
              )
            : table}
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
      )}
      <FormDialog open={cancelId !== null} onClose={() => setCancelId(null)} maxWidth="xs">
        <DialogCloseButton onClose={() => setCancelId(null)} />
        <DialogTitle>Cancel booking</DialogTitle>
        <DialogContent>
          <Typography>Cancel this booking?</Typography>
        </DialogContent>
        <DialogActions>
          <Button color="error" variant="contained" onClick={handleCancel}>
            Cancel booking
          </Button>
        </DialogActions>
      </FormDialog>
      {reschedule && (
        <RescheduleDialog
          open={!!reschedule}
          onClose={() => setReschedule(null)}
          loadOptions={fetchRescheduleOptions}
          onSubmit={handleReschedule}
          optionLabel="Time"
          submitLabel="Reschedule"
        />
      )}
      {selected && renderEntityDialog &&
        renderEntityDialog(
          selected,
          entityDialogOpen,
          () => setEntityDialogOpen(false),
          reload,
        )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Box>
  );
}

