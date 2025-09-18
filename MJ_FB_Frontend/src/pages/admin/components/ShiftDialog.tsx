import { memo, useEffect, useState } from 'react';
import { DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import FormDialog from '../../../components/FormDialog';

interface ShiftDialogInitial {
  slotId?: number;
  roleName: string;
  startTime?: string;
  endTime?: string;
  maxVolunteers?: string;
}

interface ShiftDialogProps {
  open: boolean;
  initial?: ShiftDialogInitial;
  onClose: () => void;
  onSave: (data: { startTime: string; endTime: string; maxVolunteers: string }) => void;
}

function toTimeInput(t?: string) {
  return t ? t.substring(0, 5) : '';
}

function ShiftDialog({ open, initial, onClose, onSave }: ShiftDialogProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxVolunteers, setMaxVolunteers] = useState('1');
  const [errors, setErrors] = useState({ startTime: '', endTime: '', maxVolunteers: '' });

  useEffect(() => {
    if (open) {
      setStartTime(toTimeInput(initial?.startTime));
      setEndTime(toTimeInput(initial?.endTime));
      setMaxVolunteers(initial?.maxVolunteers || '1');
      setErrors({ startTime: '', endTime: '', maxVolunteers: '' });
    }
  }, [open, initial]);

  function handleSave() {
    const newErrors = {
      startTime: startTime ? '' : 'Required',
      endTime: endTime ? '' : 'Required',
      maxVolunteers: maxVolunteers ? '' : 'Required',
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;
    onSave({ startTime, endTime, maxVolunteers });
  }

  return (
    <FormDialog open={open} onClose={onClose}>
      <DialogTitle>{initial?.slotId ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
      <DialogContent>
        <TextField margin="dense" label="Name" fullWidth value={initial?.roleName || ''} disabled />
        <TextField
          margin="dense"
          label="Start Time"
          type="time"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={startTime}
          onChange={e => {
            setStartTime(e.target.value);
            if (errors.startTime) setErrors({ ...errors, startTime: '' });
          }}
          error={Boolean(errors.startTime)}
          helperText={errors.startTime}
        />
        <TextField
          margin="dense"
          label="End Time"
          type="time"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={endTime}
          onChange={e => {
            setEndTime(e.target.value);
            if (errors.endTime) setErrors({ ...errors, endTime: '' });
          }}
          error={Boolean(errors.endTime)}
          helperText={errors.endTime}
        />
        <TextField
          margin="dense"
          label="Max Volunteers"
          fullWidth
          type="number"
          value={maxVolunteers}
          onChange={e => {
            setMaxVolunteers(e.target.value);
            if (errors.maxVolunteers) setErrors({ ...errors, maxVolunteers: '' });
          }}
          error={Boolean(errors.maxVolunteers)}
          helperText={errors.maxVolunteers}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </FormDialog>
  );
}

export default memo(ShiftDialog);
