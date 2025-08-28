import { useEffect, useState, useCallback } from 'react';
import {
  getMyVolunteerBookings,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
} from '../../api/volunteers';
import type { VolunteerBooking } from '../../types';
import { formatTime } from '../../utils/time';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DialogCloseButton from '../../components/DialogCloseButton';
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import type { AlertColor } from '@mui/material';

export default function VolunteerBookingHistory() {
  const [history, setHistory] = useState<VolunteerBooking[]>([]);
  const [cancelBooking, setCancelBooking] =
    useState<VolunteerBooking | null>(null);
  const [cancelSeriesId, setCancelSeriesId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');

  const loadHistory = useCallback(() => {
    getMyVolunteerBookings()
      .then(setHistory)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const groups = Array.from(
    history.reduce((map, b) => {
      const key = b.recurring_id ?? b.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
      return map;
    }, new Map<number, VolunteerBooking[]>() ).values()
  );

  async function handleCancel() {
    if (!cancelBooking) return;
    try {
      await cancelVolunteerBooking(cancelBooking.id);
      setSeverity('success');
      setMessage('Booking cancelled');
      loadHistory();
    } catch {
      setSeverity('error');
      setMessage('Failed to cancel booking');
    } finally {
      setCancelBooking(null);
    }
  }

  async function handleCancelSeries() {
    if (cancelSeriesId == null) return;
    try {
      await cancelRecurringVolunteerBooking(cancelSeriesId);
      setSeverity('success');
      setMessage('Series cancelled');
      loadHistory();
    } catch {
      setSeverity('error');
      setMessage('Failed to cancel series');
    } finally {
      setCancelSeriesId(null);
    }
  }

  return (
    <Page title="Booking History">
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.flatMap(group =>
              group.map(h => (
                <TableRow key={h.id}>
                  <TableCell>{h.role_name}</TableCell>
                  <TableCell>{h.date}</TableCell>
                  <TableCell>
                    {formatTime(h.start_time)} - {formatTime(h.end_time)}
                  </TableCell>
                  <TableCell>{h.status}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => setCancelBooking(h)}
                    >
                      Cancel
                    </Button>
                    {h.recurring_id && (
                      <Button
                        size="small"
                        onClick={() => setCancelSeriesId(h.recurring_id!)}
                      >
                        Cancel all upcoming
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )),
            )}
            {history.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No bookings.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!cancelBooking} onClose={() => setCancelBooking(null)}>
        <DialogCloseButton onClose={() => setCancelBooking(null)} />
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent dividers>
          Cancel booking for {cancelBooking?.role_name} on {cancelBooking?.date}?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} variant="outlined" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelSeriesId != null} onClose={() => setCancelSeriesId(null)}>
        <DialogCloseButton onClose={() => setCancelSeriesId(null)} />
        <DialogTitle>Cancel Series</DialogTitle>
        <DialogContent dividers>
          Cancel all upcoming bookings in this series?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSeries} variant="outlined" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Page>
  );
}

