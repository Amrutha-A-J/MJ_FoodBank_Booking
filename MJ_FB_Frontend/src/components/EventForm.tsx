import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Stack,
  Autocomplete,
} from '@mui/material';
import FeedbackSnackbar from './FeedbackSnackbar';
import { createEvent } from '../api/events';
import { searchStaff } from '../api/staff';

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const categories = [
  'harvest pantry',
  'volunteers',
  'warehouse',
  'fundraiser',
  'staff leave',
];

interface StaffOption {
  id: number | 'all';
  name: string;
}

const TAG_ALL: StaffOption = { id: 'all', name: 'Tag All' };

export default function EventForm({ open, onClose, onCreated }: EventFormProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [staffInput, setStaffInput] = useState('');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([TAG_ALL]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    let active = true;
    if (staffInput.length < 2) {
      setStaffOptions([TAG_ALL]);
      return;
    }
    searchStaff(staffInput)
      .then(res => {
        if (!active) return;
        setStaffOptions([...res, TAG_ALL]);
      })
      .catch(() => setStaffOptions([TAG_ALL]));
    return () => {
      active = false;
    };
  }, [staffInput]);

  function handleStaffChange(_e: any, value: StaffOption[]) {
    if (value.some(v => v.id === 'all')) {
      searchStaff(' ')
        .then(all => {
          setStaffOptions([...all, TAG_ALL]);
          setStaff(all);
        })
        .catch(() => setStaff([]));
    } else {
      setStaff(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createEvent({
        title,
        details,
        category,
        date,
        staffIds: staff.map(s => s.id as number),
      });
      setSnackbar({ open: true, message: 'Event created', severity: 'success' });
      setTitle('');
      setDetails('');
      setCategory('');
      setDate('');
      setStaff([]);
      setStaffInput('');
      onCreated?.();
      onClose();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to create event', severity: 'error' });
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Create Event</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} mt={1}>
              <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} fullWidth required />
              <TextField label="Details" value={details} onChange={e => setDetails(e.target.value)} multiline rows={3} fullWidth />
              <TextField select label="Category" value={category} onChange={e => setCategory(e.target.value)} fullWidth required>
                {categories.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
              <Autocomplete
                multiple
                options={staffOptions}
                value={staff}
                onChange={handleStaffChange}
                onInputChange={(_e, val) => setStaffInput(val)}
                getOptionLabel={option => option.name}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={params => <TextField {...params} label="Staff Involved" />}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} size="small">Cancel</Button>
            <Button type="submit" variant="contained" size="small" disabled={!title || !category || !date}>
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </>
  );
}
