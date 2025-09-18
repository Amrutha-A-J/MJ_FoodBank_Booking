import { useState, useEffect } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from '@mui/material';
import DialogCloseButton from './DialogCloseButton';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormDialog from './FormDialog';
import { formatReginaDate } from '../utils/date';
import type { AlertColor } from '@mui/material';

interface Option {
  id: string;
  label: string;
}

interface RescheduleDialogProps {
  open: boolean;
  onClose: () => void;
  loadOptions: (date: string) => Promise<Option[]>;
  onSubmit: (date: string, optionId: string) => Promise<void>;
  optionLabel: string;
  submitLabel: string;
  title?: string;
}

export default function RescheduleDialog({
  open,
  onClose,
  loadOptions,
  onSubmit,
  optionLabel,
  submitLabel,
  title = 'Reschedule Booking',
}: RescheduleDialogProps) {
  const [date, setDate] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [optionId, setOptionId] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const todayStr = formatReginaDate(new Date());

  useEffect(() => {
    if (!open) {
      setDate('');
      setOptionId('');
      setOptions([]);
      setMessage('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !date) return;
    loadOptions(date)
      .then(setOptions)
      .catch(() => setOptions([]));
  }, [open, date, loadOptions]);

  async function handleSubmit() {
    if (!date || !optionId) {
      setSeverity('error');
      setMessage(
        `Please select date and ${optionLabel.toLowerCase()}`,
      );
      return;
    }
    try {
      await onSubmit(date, optionId);
      onClose();
      setDate('');
      setOptionId('');
      setOptions([]);
    } catch (err: any) {
      setSeverity('error');
      setMessage(err.message);
    }
  }

  return (
    <FormDialog open={open} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>{title}</DialogTitle>
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
          label={optionLabel}
          value={optionId}
          onChange={e => setOptionId(e.target.value)}
          fullWidth
          margin="normal"
          disabled={!date || options.length === 0}
        >
          {options.map(o => (
            <MenuItem key={o.id} value={o.id}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <FeedbackSnackbar
          open={!!message}
          message={message}
          onClose={() => setMessage('')}
          severity={severity}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} variant="outlined" color="primary">
          {submitLabel}
        </Button>
      </DialogActions>
    </FormDialog>
  );
}

