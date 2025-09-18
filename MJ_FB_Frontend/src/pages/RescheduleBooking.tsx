import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  TextField,
  MenuItem,
  Button,
  Grid,
} from '@mui/material';
import Page from '../components/Page';
import FormCard from '../components/FormCard';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import ClientBottomNav from '../components/ClientBottomNav';
import VolunteerBottomNav from '../components/VolunteerBottomNav';
import { getSlots, rescheduleBookingByToken, validateRescheduleToken } from '../api/bookings';
import { formatTime } from '../utils/time';
import { formatReginaDate, toDayjs } from '../utils/date';
import type { Slot } from '../types';
import { useAuth } from '../hooks/useAuth';

export default function RescheduleBooking() {
  const { token } = useParams();
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(true);
  const todayStr = formatReginaDate(new Date());
  const { role } = useAuth();

  useEffect(() => {
    if (!token) {
      setError('Invalid or expired token');
      setTokenValid(false);
      return;
    }
    validateRescheduleToken(token).catch(err => {
      setError(err.message);
      setTokenValid(false);
    });
  }, [token]);

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
      setError('Invalid or expired token');
      return;
    }
    if (!date || !slotId) {
      setError('Select a date and time');
      return;
    }
    try {
      await rescheduleBookingByToken(token, slotId, date);
      setMessage('Booking rescheduled');
    } catch (err: any) {
      setError(err.message || 'Rescheduling failed');
    }
  }

  return (
    <Page
      title="Reschedule"
      sx={{ pb: { xs: 'calc(72px + env(safe-area-inset-bottom))' } }}
    >
      <Grid container spacing={2} justifyContent="center">
        <Grid size={{ xs: 12, sm: 8, md: 6 }}>
          {tokenValid && (
            <FormCard
              title="Reschedule"
              onSubmit={handleSubmit}
              actions={
                <Button type="submit" variant="contained">
                  Reschedule
                </Button>
              }
            >
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
                label="Time"
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
          )}
        </Grid>
      </Grid>
      <FeedbackSnackbar
        open={!!error || !!message}
        onClose={() => {
          setError('');
          setMessage('');
        }}
        message={error || message}
        severity={error ? 'error' : 'success'}
      />
      {role === 'volunteer' ? <VolunteerBottomNav /> : <ClientBottomNav />}
    </Page>
  );
}
