import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import FeedbackSnackbar from './FeedbackSnackbar';

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
  const [roleId, setRoleId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) {
      setDate('');
      setRoleId('');
      setMessage('');
    }
  }, [open]);

  function handleSubmit() {
    if (!date || !roleId) {
      setMessage('Please enter date and role ID');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setMessage('Date must be YYYY-MM-DD');
      return;
    }
    if (!/^\d+$/.test(roleId)) {
      setMessage('Role ID must be a number');
      return;
    }
    onSubmit(date, Number(roleId));
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
          label="Role ID"
          type="number"
          value={roleId}
          onChange={e => setRoleId(e.target.value)}
          fullWidth
          margin="normal"
        />
        <FeedbackSnackbar
          open={!!message}
          message={message}
          onClose={() => setMessage('')}
          severity="error"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="primary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="outlined" color="primary">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

