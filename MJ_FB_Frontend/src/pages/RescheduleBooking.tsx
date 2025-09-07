import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  TextField,
  MenuItem,
  Button,
} from '@mui/material';
import Page from '../components/Page';
import FormCard from '../components/FormCard';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import { getSlots, rescheduleBookingByToken } from '../api/bookings';
import { formatTime } from '../utils/time';
import { formatReginaDate, toDayjs } from '../utils/date';
import type { Slot } from '../types';
import { useTranslation } from 'react-i18next';

export default function RescheduleBooking() {
  const { token } = useParams();
  const { t } = useTranslation();
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const todayStr = formatReginaDate(new Date());

  useEffect(() => {
    if (date) {
      getSlots(date)
        .then(s => {
          if (date === todayStr) {
            const now = toDayjs().toDate();
            s = s.filter(
              slot => toDayjs(`${date}T${slot.startTime}`).toDate() > now,
            );
          }
          s = s.filter(
            slot =>
              (slot.available ?? 0) > 0 &&
              slot.status !== 'blocked' &&
              slot.status !== 'break',
          );
          setSlots(s);
        })
        .catch(() => setSlots([]));
    } else {
      setSlots([]);
      setSlotId('');
    }
  }, [date, todayStr]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setError(t('invalid_or_expired_token'));
      return;
    }
    if (!date || !slotId) {
      setError(t('select_date_time'));
      return;
    }
    try {
      await rescheduleBookingByToken(token, slotId, date);
      setMessage(t('booking_rescheduled'));
    } catch {
      setError(t('reschedule_failed'));
    }
  }

  return (
    <Page title={t('reschedule')}>
      <FormCard
        title={t('reschedule')}
        onSubmit={handleSubmit}
        actions={
          <Button type="submit" variant="contained" size="small">
            {t('reschedule')}
          </Button>
        }
      >
        <TextField
          type="date"
          label={t('date')}
          value={date}
          onChange={e => setDate(e.target.value)}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: todayStr }}
        />
        <TextField
          select
          label={t('time')}
          value={slotId}
          onChange={e => setSlotId(e.target.value)}
          fullWidth
          margin="normal"
          disabled={!date || slots.length === 0}
        >
          {slots.map(s => (
            <MenuItem key={s.id} value={s.id}>
              {formatTime(s.startTime)} - {formatTime(s.endTime)}
            </MenuItem>
          ))}
        </TextField>
      </FormCard>
      <FeedbackSnackbar
        open={!!error || !!message}
        onClose={() => {
          setError('');
          setMessage('');
        }}
        message={error || message}
        severity={error ? 'error' : 'success'}
      />
    </Page>
  );
}
