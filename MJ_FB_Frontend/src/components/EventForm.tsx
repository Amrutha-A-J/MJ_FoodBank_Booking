import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Autocomplete,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTranslation } from 'react-i18next';
import FeedbackSnackbar from './FeedbackSnackbar';
import { createEvent } from '../api/events';
import { searchStaff, type StaffOption } from '../api/staff';
import DialogCloseButton from './DialogCloseButton';
import { formatReginaDate } from '../utils/date';

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const categories = [
  'harvest pantry',
  'volunteers',
  'warehouse',
  'fundraiser',
  'staff leave',
];

const tagAllOption: StaffOption = { id: -1, name: 'Tag All' };

export default function EventForm({ open, onClose, onCreated }: EventFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [staffInput, setStaffInput] = useState('');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([tagAllOption]);
  const [selectedStaff, setSelectedStaff] = useState<StaffOption[]>([]);
  const [visibleToVolunteers, setVisibleToVolunteers] = useState(false);
  const [visibleToClients, setVisibleToClients] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!staffInput) {
      setStaffOptions([tagAllOption]);
      return undefined;
    }
    searchStaff(staffInput)
      .then(data => {
        if (active) setStaffOptions([tagAllOption, ...data]);
      })
      .catch(() => {
        if (active) setStaffOptions([tagAllOption]);
      });
    return () => {
      active = false;
    };
  }, [staffInput]);

  async function handleStaffChange(_: any, value: StaffOption[]) {
    if (value.some(v => v.id === tagAllOption.id)) {
      try {
        const all = await searchStaff('%');
        setSelectedStaff(all);
      } catch {
        setSelectedStaff([]);
      }
    } else {
      setSelectedStaff(value);
    }
  }

  async function submit() {
    if (!title || !category || !startDate || !endDate) {
      setError('Please fill in title, category, start date, and end date');
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be before start date');
      return;
    }
    try {
      await createEvent({
        title,
        details,
        category,
        startDate: formatReginaDate(startDate),
        endDate: formatReginaDate(endDate),
        staffIds: selectedStaff.map(s => s.id),
        visibleToVolunteers,
        visibleToClients,
      });
      setSuccess('Event created');
      setTitle('');
      setDetails('');
      setCategory('');
      setStartDate(null);
      setEndDate(null);
      setSelectedStaff([]);
      setVisibleToVolunteers(false);
      setVisibleToClients(false);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogCloseButton onClose={onClose} />
        <DialogTitle>Create Event</DialogTitle>
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
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={t('start_date')}
              value={startDate}
              onChange={newDate => setStartDate(newDate)}
              slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
            />
            <DatePicker
              label={t('end_date')}
              value={endDate}
              onChange={newDate => setEndDate(newDate)}
              slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
            />
          </LocalizationProvider>
          <Autocomplete
            multiple
            options={staffOptions}
            value={selectedStaff}
            onChange={handleStaffChange}
            onInputChange={(_, val) => setStaffInput(val)}
            getOptionLabel={option => option.name}
            renderInput={params => (
              <TextField {...params} label="Staff Involved" margin="normal" />
            )}
          />
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
            Create
          </Button>
        </DialogActions>
      </Dialog>
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
