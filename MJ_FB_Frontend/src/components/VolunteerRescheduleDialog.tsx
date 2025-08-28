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
import { getRoles } from '../api/volunteers';
import type { RoleOption } from '../types';
import DialogCloseButton from './DialogCloseButton';

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
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [message, setMessage] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!open) {
      setDate('');
      setRoleId('');
      setMessage('');
      return;
    }
    getRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [open]);

  function handleSubmit() {
    if (!date || !roleId) {
      setMessage('Please select date and role');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setMessage('Date must be YYYY-MM-DD');
      return;
    }
    onSubmit(date, Number(roleId));
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
          value={roleId}
          onChange={e => setRoleId(e.target.value)}
          fullWidth
          margin="normal"
        >
          {roles.map(r => (
            <MenuItem key={r.roleId} value={r.roleId.toString()}>
              {r.roleName} ({r.categoryName})
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

