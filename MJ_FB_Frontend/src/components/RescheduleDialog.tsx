import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from '@mui/material';
import { getSlots, rescheduleBookingByToken } from '../api/bookings';
import { formatTime } from '../utils/time';
import FeedbackSnackbar from './FeedbackSnackbar';
import type { Slot } from '../types';
import type { AlertColor } from '@mui/material';

interface RescheduleDialogProps {
  open: boolean;
  rescheduleToken: string;
  onClose: () => void;
  onRescheduled: () => void;
}

export default function RescheduleDialog({
  open,
  rescheduleToken,
  onClose,
  onRescheduled,
}: RescheduleDialogProps) {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState('');
  const [message, setMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');

  useEffect(() => {
    if (open && date) {
      getSlots(date)
        .then(setSlots)
        .catch(() => setSlots([]));
    } else {
      setSlots([]);
      setSlotId('');
    }
  }, [open, date]);

  async function submit() {
    if (!date || !slotId) {
      setSnackbarSeverity('error');
      setMessage('Please select date and time');
      return;
    }
    try {
      await rescheduleBookingByToken(rescheduleToken, slotId, date);
      onRescheduled();
      onClose();
      setDate('');
      setSlotId('');
    } catch {
      setSnackbarSeverity('error');
      setMessage('Failed to reschedule booking');
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Reschedule Booking</DialogTitle>
      <DialogContent>
        <TextField
          type="date"
          label="Date"
          value={date}
          onChange={e => setDate(e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Time"
          value={slotId}
          onChange={e => setSlotId(e.target.value)}
          fullWidth
          margin="normal"
          disabled={!date || slots.length === 0}
        >
          {slots.map(s => (
            <MenuItem key={s.id} value={s.id}>
              {formatTime(s.startTime)} - {formatTime(s.endTime)}
            </MenuItem>
          ))}
        </TextField>
        <FeedbackSnackbar
          open={!!message}
          message={message}
          onClose={() => setMessage('')}
          severity={snackbarSeverity}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="primary">
          Cancel
        </Button>
        <Button onClick={submit} variant="outlined" color="primary">
          Reschedule
        </Button>
      </DialogActions>
    </Dialog>
  );
}

