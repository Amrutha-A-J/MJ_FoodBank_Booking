import { memo, useEffect, useState } from 'react';
import { DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import FormDialog from '../../../components/FormDialog';

interface SubRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    roleName: string;
    startTime: string;
    endTime: string;
    maxVolunteers: string;
    isWednesdaySlot: boolean;
  }) => void;
}

function SubRoleDialog({ open, onClose, onSave }: SubRoleDialogProps) {
  const [roleName, setRoleName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxVolunteers, setMaxVolunteers] = useState('1');
  const [errors, setErrors] = useState({
    roleName: '',
    startTime: '',
    endTime: '',
    maxVolunteers: '',
  });

  useEffect(() => {
    if (open) {
      setRoleName('');
      setStartTime('');
      setEndTime('');
      setMaxVolunteers('1');
      setErrors({ roleName: '', startTime: '', endTime: '', maxVolunteers: '' });
    }
  }, [open]);

  function handleSave() {
    const newErrors = {
      roleName: roleName ? '' : 'Required',
      startTime: startTime ? '' : 'Required',
      endTime: endTime ? '' : 'Required',
      maxVolunteers: maxVolunteers ? '' : 'Required',
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;
    onSave({ roleName, startTime, endTime, maxVolunteers, isWednesdaySlot: false });
  }

  return (
    <FormDialog open={open} onClose={onClose}>
      <DialogTitle>Add Sub-role</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Name"
          fullWidth
          value={roleName}
          onChange={e => {
            setRoleName(e.target.value);
            if (errors.roleName) setErrors({ ...errors, roleName: '' });
          }}
          error={Boolean(errors.roleName)}
          helperText={errors.roleName}
        />
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

export default memo(SubRoleDialog);
