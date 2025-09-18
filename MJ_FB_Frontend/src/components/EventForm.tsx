import { useState, useEffect } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { formatReginaDate } from '../utils/date';
import type { Dayjs } from 'dayjs';
import FeedbackSnackbar from './FeedbackSnackbar';
import { createEvent, updateEvent, type Event } from '../api/events';
import DialogCloseButton from './DialogCloseButton';
import FormDialog from './FormDialog';

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  event?: Event;
}

const categories = [
  'harvest pantry',
  'volunteers',
  'warehouse',
  'fundraiser',
  'staff leave',
];

export default function EventForm({ open, onClose, onSaved, event }: EventFormProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [visibleToVolunteers, setVisibleToVolunteers] = useState(false);
  const [visibleToClients, setVisibleToClients] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDetails(event.details ?? '');
      setCategory(event.category ?? '');
      setStartDate(dayjs(event.startDate));
      setEndDate(dayjs(event.endDate));
      setVisibleToVolunteers(!!event.visibleToVolunteers);
      setVisibleToClients(!!event.visibleToClients);
    } else if (open) {
      setTitle('');
      setDetails('');
      setCategory('');
      setStartDate(null);
      setEndDate(null);
      setVisibleToVolunteers(false);
      setVisibleToClients(false);
    }
  }, [event, open]);

  async function submit() {
    if (!title || !category || !startDate || !endDate) {
      setError('Please fill in title, category, start date, and end date');
      return;
    }
    if (endDate.isBefore(startDate)) {
      setError('End date cannot be before start date');
      return;
    }
    try {
      if (event) {
        await updateEvent(event.id, {
          title,
          details,
          category,
          startDate: formatReginaDate(startDate),
          endDate: formatReginaDate(endDate),
          visibleToVolunteers,
          visibleToClients,
        });
        setSuccess('Event updated');
      } else {
        await createEvent({
          title,
          details,
          category,
          startDate: formatReginaDate(startDate),
          endDate: formatReginaDate(endDate),
          visibleToVolunteers,
          visibleToClients,
        });
        setSuccess('Event created');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
        <FormDialog open={open} onClose={onClose}>
          <DialogCloseButton onClose={onClose} />
          <DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Details"
            value={details}
            onChange={e => setDetails(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            select
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            fullWidth
            margin="normal"
          >
            {categories.map(c => (
              <MenuItem key={c} value={c} aria-label={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <LocalizationProvider dateAdapter={AdapterDayjs} dateLibInstance={dayjs}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={value => setStartDate(value as Dayjs | null)}
              slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={value => setEndDate(value as Dayjs | null)}
              slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
            />
          </LocalizationProvider>
          <FormControlLabel
            control={
              <Checkbox
                checked={visibleToVolunteers}
                onChange={e => setVisibleToVolunteers(e.target.checked)}
              />
            }
            label="Visible to Volunteers"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={visibleToClients}
                onChange={e => setVisibleToClients(e.target.checked)}
              />
            }
            label="Visible to Clients"
          />
        </DialogContent>
          <DialogActions>
            <Button onClick={submit} variant="contained" color="primary">
              {event ? 'Save' : 'Create'}
            </Button>
          </DialogActions>
        </FormDialog>
      <FeedbackSnackbar
        open={!!success}
        message={success}
        onClose={() => setSuccess('')}
        severity="success"
      />
      <FeedbackSnackbar
        open={!!error}
        message={error}
        onClose={() => setError('')}
        severity="error"
      />
    </>
  );
}
