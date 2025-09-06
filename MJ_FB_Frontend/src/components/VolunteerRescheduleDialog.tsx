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
import FeedbackSnackbar from './FeedbackSnackbar';
import { getVolunteerRolesForVolunteer } from '../api/volunteers';
import type { VolunteerRole } from '../types';
import DialogCloseButton from './DialogCloseButton';
import { formatReginaDate } from '../utils/date';
import { formatTime } from '../utils/time';

interface RescheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (date: string, roleId: number) => void;
}

export default function RescheduleDialog({
  open,
  onClose,
  onSubmit,
}: RescheduleDialogProps) {
  const [date, setDate] = useState('');
  const [slotId, setSlotId] = useState('');
  const [slots, setSlots] = useState<VolunteerRole[]>([]);
  const [message, setMessage] = useState('');
  const todayStr = formatReginaDate(new Date());

  useEffect(() => {
    if (!open) {
      setDate('');
      setSlotId('');
      setSlots([]);
      setMessage('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !date) return;
    setSlotId('');
    getVolunteerRolesForVolunteer(date)
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [date, open]);

  function handleSubmit() {
    if (!date || !slotId) {
      setMessage('Please select date and role');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setMessage('Date must be YYYY-MM-DD');
      return;
    }
    onSubmit(date, Number(slotId));
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
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
          inputProps={{ min: todayStr }}
        />
        <TextField
          select
          label="Role"
          value={slotId}
          onChange={e => setSlotId(e.target.value)}
          fullWidth
          margin="normal"
          disabled={!date || slots.length === 0}
        >
          {slots
            .filter(s => s.available > 0)
            .map(s => (
              <MenuItem key={s.id} value={s.id.toString()}>
                {`${s.name} ${formatTime(s.start_time)}–${formatTime(s.end_time)}`}
              </MenuItem>
            ))}
        </TextField>
        <FeedbackSnackbar
          open={!!message}
          message={message}
          onClose={() => setMessage('')}
          severity="error"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} variant="outlined" color="primary">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

