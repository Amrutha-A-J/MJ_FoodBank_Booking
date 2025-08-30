import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';
import FeedbackSnackbar from './FeedbackSnackbar';
import {
  getRoleShifts,
  getVolunteerBookingsByRole,
  rescheduleVolunteerBookingByToken,
  updateVolunteerBookingStatus,
} from '../api/volunteers';
import type { VolunteerBookingDetail, Shift } from '../types';
import type { ApiError } from '../api/client';
import { formatTime } from '../utils/time';

interface ManageVolunteerShiftDialogProps {
  open: boolean;
  booking: VolunteerBookingDetail | null;
  onClose: () => void;
  onUpdated: (message: string, severity: AlertColor) => void;
}

export default function ManageVolunteerShiftDialog({
  open,
  booking,
  onClose,
  onUpdated,
}: ManageVolunteerShiftDialogProps) {
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (open) {
      setStatus('');
      setDate('');
      setShiftId('');
      setShifts([]);
      setBookings([]);
      setReason('');
      setMessage('');
    }
  }, [open]);

  useEffect(() => {
    if (status === 'reschedule' && booking) {
      (async () => {
        try {
          const s = await getRoleShifts(booking.role_id);
          setShifts(s);
          const data = await Promise.all(
            s.map(sh => getVolunteerBookingsByRole(sh.shiftId)),
          );
          setBookings(data.flat());
        } catch {
          setShifts([]);
          setBookings([]);
        }
      })();
    } else {
      setShifts([]);
      setBookings([]);
      setDate('');
      setShiftId('');
    }
  }, [status, booking?.role_id]);

  if (!booking) return null;

  function timesOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ) {
    return startA < endB && startB < endA;
  }

  function isShiftDisabled(shift: Shift): boolean {
    if (!date) return true;
    const bookingsForShift = bookings.filter(
      b =>
        b.role_id === shift.shiftId &&
        b.date === date &&
        b.id !== booking.id &&
        b.status !== 'cancelled',
    );
    const isFull = bookingsForShift.length >= shift.maxVolunteers;
    const volunteerConflict = bookings.some(
      b =>
        b.volunteer_id === booking.volunteer_id &&
        b.id !== booking.id &&
        b.date === date &&
        timesOverlap(b.start_time, b.end_time, shift.startTime, shift.endTime),
    );
    return isFull || volunteerConflict;
  }

  async function handleSubmit() {
    try {
      switch (status) {
        case 'reschedule':
          if (!date || !shiftId) {
            setSeverity('error');
            setMessage('Please select date and time');
            return;
          }
          await rescheduleVolunteerBookingByToken(
            booking.reschedule_token || '',
            Number(shiftId),
            date,
          );
          onUpdated('Booking rescheduled', 'success');
          onClose();
          return;
        case 'cancel':
          if (!reason.trim()) {
            setSeverity('error');
            setMessage('Reason required');
            return;
          }
          await updateVolunteerBookingStatus(booking.id, 'cancelled', reason);
          onUpdated('Booking cancelled', 'success');
          onClose();
          return;
        case 'completed':
        case 'no_show':
          await updateVolunteerBookingStatus(booking.id, status as any);
          onUpdated('Status updated', 'success');
          onClose();
          return;
        default:
          setSeverity('error');
          setMessage('Please select a status');
          return;
      }
    } catch (e) {
      const err = e as ApiError;
      setSeverity('error');
      setMessage(err.message || 'Action failed');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Manage Shift</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Typography>Volunteer: {booking.volunteer_name}</Typography>
          <Typography>
            {booking.role_name} on {booking.date} {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </Typography>
          <TextField
            select
            label="Status"
            value={status}
            onChange={e => setStatus(e.target.value)}
            fullWidth
          >
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="no_show">No Show</MenuItem>
            <MenuItem value="cancel">Cancel</MenuItem>
            <MenuItem value="reschedule">Reschedule</MenuItem>
          </TextField>
          {status === 'cancel' && (
            <TextField
              label="Reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              fullWidth
            />
          )}
          {status === 'reschedule' && (
            <>
              <TextField
                type="date"
                label="Date"
                value={date}
                onChange={e => setDate(e.target.value)}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: todayStr }}
              />
              <TextField
                select
                label="Shift"
                value={shiftId}
                onChange={e => setShiftId(e.target.value)}
                fullWidth
                margin="normal"
                disabled={!date}
              >
                {shifts.map(s => (
                  <MenuItem
                    key={s.shiftId}
                    value={s.shiftId.toString()}
                    disabled={isShiftDisabled(s)}
                  >
                    {`${formatTime(s.startTime)} - ${formatTime(s.endTime)}`}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
          <FeedbackSnackbar
            open={!!message}
            message={message}
            onClose={() => setMessage('')}
            severity={severity}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} variant="outlined" color="primary">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
