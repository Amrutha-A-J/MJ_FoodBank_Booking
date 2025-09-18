import { useState, useEffect } from 'react';
import {
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
import FormDialog from './FormDialog';
import {
  getRoleShifts,
  getVolunteerBookingsByRole,
  rescheduleVolunteerBookingByToken,
  updateVolunteerBookingStatus,
} from '../api/volunteers';
import type { VolunteerBookingDetail, Shift, VolunteerBookingStatus } from '../types';
import { formatTime } from '../utils/time';
import { formatReginaDate } from '../utils/date';
import getApiErrorMessage from '../utils/getApiErrorMessage';

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
  type ManageStatus = 'reschedule' | 'cancel' | VolunteerBookingStatus;
  const [status, setStatus] = useState<ManageStatus | ''>('');
  const [date, setDate] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bookings, setBookings] = useState<VolunteerBookingDetail[]>([]);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const todayStr = formatReginaDate(new Date());

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
  const b = booking;

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
      bk =>
        bk.role_id === shift.shiftId &&
        bk.date === date &&
        bk.id !== b.id &&
        bk.status !== 'cancelled',
    );
    const isFull = bookingsForShift.length >= shift.maxVolunteers;
    const volunteerConflict = bookings.some(
      bk =>
        bk.volunteer_id === b.volunteer_id &&
        bk.id !== b.id &&
        bk.date === date &&
        timesOverlap(bk.start_time, bk.end_time, shift.startTime, shift.endTime),
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
            b.reschedule_token || '',
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
          await updateVolunteerBookingStatus(b.id, 'cancelled', reason);
          onUpdated('Booking cancelled', 'success');
          onClose();
          return;
        case 'completed':
        case 'no_show':
          await updateVolunteerBookingStatus(b.id, status);
          onUpdated('Status updated', 'success');
          onClose();
          return;
        default:
          setSeverity('error');
          setMessage('Please select a status');
          return;
      }
    } catch (err) {
      setSeverity('error');
      setMessage(getApiErrorMessage(err, 'Failed to update booking'));
    }
  }

  const availableShifts = shifts.filter(s => !isShiftDisabled(s));

  return (
    <FormDialog open={open} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Manage Shift</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Typography>Volunteer: {b.volunteer_name}</Typography>
          <Typography>
            {b.role_name} on {b.date} {formatTime(b.start_time)} - {formatTime(b.end_time)}
          </Typography>
          {b.note && <Typography>Note: {b.note}</Typography>}
          <TextField
            select
            label="Status"
            value={status}
            onChange={e => setStatus(e.target.value as ManageStatus)}
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
                {availableShifts.length > 0 ? (
                  availableShifts.map(s => (
                    <MenuItem key={s.shiftId} value={s.shiftId.toString()}>
                      {`${formatTime(s.startTime)} - ${formatTime(s.endTime)}`}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No shifts available</MenuItem>
                )}
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
    </FormDialog>
  );
}
