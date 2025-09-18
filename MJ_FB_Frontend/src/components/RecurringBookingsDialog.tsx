import { useState } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { VolunteerRole } from '../types';

interface Props {
  open: boolean;
  roles: VolunteerRole[];
  onClose: () => void;
  onSubmit: (roleId: number) => void;
}

export default function RecurringBookingsDialog({ open, roles, onClose, onSubmit }: Props) {
  const [role, setRole] = useState('');

  function handleSubmit() {
    const id = Number(role);
    if (!Number.isNaN(id)) {
      onSubmit(id);
    }
    onClose();
  }

  return (
    <FormDialog open={open} onClose={onClose} data-testid="recurring-bookings-dialog">
      <DialogTitle>Recurring Booking</DialogTitle>
      <DialogContent>
        <FormControl fullWidth>
          <InputLabel id="recurring-role-label">Role</InputLabel>
          <Select
            labelId="recurring-role-label"
            id="recurring-role-select"
            value={role}
            label="Role"
            onChange={e => setRole(e.target.value)}
          >
            <MenuItem value="">
              <em>Select role</em>
            </MenuItem>
            {roles.map(r => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} variant="outlined" color="primary">
          Submit
        </Button>
      </DialogActions>
    </FormDialog>
  );
}

import FormDialog from './FormDialog';
