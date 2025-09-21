import { useEffect, useState, useCallback } from 'react';
import {
  getMyVolunteerBookings,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
  rescheduleVolunteerBookingByToken,
} from '../../api/volunteers';
import type { VolunteerBooking } from '../../types';
import Page from '../../components/Page';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import DialogCloseButton from '../../components/DialogCloseButton';
import RescheduleDialog from '../../components/RescheduleDialog';
import VolunteerBottomNav from '../../components/VolunteerBottomNav';
import BookingHistoryTable from '../../components/BookingHistoryTable';
import {
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import { getVolunteerRolesForVolunteer } from '../../api/volunteers';
import { formatTime } from '../../utils/time';
import FormDialog from '../../components/FormDialog';

export default function VolunteerBookingHistory() {
  const [history, setHistory] = useState<VolunteerBooking[]>([]);
  const [cancelBooking, setCancelBooking] =
    useState<VolunteerBooking | null>(null);
  const [cancelSeriesId, setCancelSeriesId] = useState<number | null>(null);
  const [rescheduleBooking, setRescheduleBooking] =
    useState<VolunteerBooking | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');

  const loadHistory = useCallback(() => {
    getMyVolunteerBookings()
      .then(setHistory)
      .catch(() => {
        setSeverity('error');
        setMessage('Failed to load booking history');
      });
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
  const rows = groups.flatMap(group => group);

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

  async function handleReschedule(date: string, roleId: string) {
    if (!rescheduleBooking) return;
    try {
      await rescheduleVolunteerBookingByToken(
        rescheduleBooking.reschedule_token || '',
        Number(roleId),
        date,
      );
      setSeverity('success');
      setMessage('Booking rescheduled');
      loadHistory();
    } catch {
      setSeverity('error');
      setMessage('Failed to reschedule booking');
    } finally {
      setRescheduleBooking(null);
    }
  }

  async function loadRoleOptions(date: string) {
    try {
      const roles = await getVolunteerRolesForVolunteer(date);
      return roles
        .filter(r => r.available > 0)
        .map(r => ({
          id: r.id.toString(),
          label: `${r.name} ${formatTime(r.start_time)}–${formatTime(
            r.end_time,
          )}`,
        }));
    } catch {
      return [];
    }
  }

  return (
    <Page title="Volunteer Booking History">
      {rows.length === 0 ? (
        <Typography align="center">No bookings</Typography>
      ) : (
        <BookingHistoryTable
          rows={rows}
          showRole
          onCancel={b => setCancelBooking(b)}
          onReschedule={b => setRescheduleBooking(b)}
          onCancelSeries={id => setCancelSeriesId(id)}
          getRowKey={h => h.id}
        />
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Bookings and cancellations older than one year are archived and no
        longer appear here.
      </Typography>

      <FormDialog open={!!cancelBooking} onClose={() => setCancelBooking(null)} maxWidth="xs">
        <DialogCloseButton onClose={() => setCancelBooking(null)} />
        <DialogTitle>Cancel booking</DialogTitle>
        <DialogContent dividers>
          {`Cancel booking for ${cancelBooking?.role_name} on ${cancelBooking?.date}?`}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} variant="outlined" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </FormDialog>

      <FormDialog
        open={cancelSeriesId != null}
        onClose={() => setCancelSeriesId(null)}
        maxWidth="xs"
      >
        <DialogCloseButton onClose={() => setCancelSeriesId(null)} />
        <DialogTitle>Cancel series</DialogTitle>
        <DialogContent dividers>
          Cancel all upcoming bookings?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSeries} variant="outlined" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </FormDialog>

      <RescheduleDialog
        open={!!rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        loadOptions={loadRoleOptions}
        onSubmit={handleReschedule}
        optionLabel="Role"
        submitLabel="Submit"
      />

      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
      <VolunteerBottomNav />
    </Page>
  );
}

