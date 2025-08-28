import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';
import FeedbackSnackbar from './FeedbackSnackbar';
import { getSlots, rescheduleBookingByToken, cancelBooking, markBookingNoShow, markBookingVisited } from '../api/bookings';
import { createClientVisit } from '../api/clientVisits';
import { formatTime } from '../utils/time';
import type { Slot } from '../types';

interface Booking {
  id: number;
  reschedule_token: string;
  client_id: number;
  user_name: string;
  date: string;
}

interface ManageBookingDialogProps {
  open: boolean;
  booking: Booking;
  onClose: () => void;
  onUpdated: (message: string, severity: AlertColor) => void;
}

export default function ManageBookingDialog({ open, booking, onClose, onUpdated }: ManageBookingDialogProps) {
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState('');
  const [reason, setReason] = useState('');
  const [weightWithCart, setWeightWithCart] = useState('');
  const [weightWithoutCart, setWeightWithoutCart] = useState('');
  const [cartTare, setCartTare] = useState(27);
  const [petItem, setPetItem] = useState('0');
  const [autoWeight, setAutoWeight] = useState(true);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (open) {
      setStatus('');
      setDate('');
      setSlots([]);
      setSlotId('');
      setReason('');
      setWeightWithCart('');
      setWeightWithoutCart('');
      setPetItem('0');
      setAutoWeight(true);
      setCartTare(27);
    }
  }, [open]);

  useEffect(() => {
    if (status === 'reschedule' && date) {
      getSlots(date)
        .then(s => {
          if (date === todayStr) {
            const now = new Date();
            s = s.filter(slot => new Date(`${date}T${slot.startTime}`) > now);
          }
          setSlots(s);
        })
        .catch(() => setSlots([]));
    } else {
      setSlots([]);
      setSlotId('');
    }
  }, [status, date, todayStr]);

  useEffect(() => {
    if (status === 'visited' && autoWeight) {
      setWeightWithoutCart(
        weightWithCart ? String(Number(weightWithCart) - cartTare) : ''
      );
    }
  }, [status, weightWithCart, cartTare, autoWeight]);

  async function handleSubmit() {
    try {
      switch (status) {
        case 'reschedule':
          if (!date || !slotId) {
            setSeverity('error');
            setMessage('Please select date and time');
            return;
          }
          await rescheduleBookingByToken(booking.reschedule_token, slotId, date);
          onUpdated('Booking rescheduled', 'success');
          onClose();
          return;
        case 'cancel':
          if (!reason.trim()) {
            setSeverity('error');
            setMessage('Reason required');
            return;
          }
          await cancelBooking(String(booking.id), reason);
          onUpdated('Booking cancelled', 'success');
          onClose();
          return;
        case 'no_show':
          await markBookingNoShow(booking.id);
          onUpdated('Booking marked no-show', 'success');
          onClose();
          return;
        case 'visited':
          if (!weightWithCart || !weightWithoutCart) {
            setSeverity('error');
            setMessage('Weights required');
            return;
          }
          await createClientVisit({
            date: booking.date,
            clientId: booking.client_id,
            anonymous: false,
            weightWithCart: Number(weightWithCart),
            weightWithoutCart: Number(weightWithoutCart),
            petItem: Number(petItem || 0),
          });
          await markBookingVisited(booking.id);
          onUpdated('Visit recorded', 'success');
          onClose();
          return;
        default:
          setSeverity('error');
          setMessage('Please select a status');
          return;
      }
    } catch (err) {
      setSeverity('error');
      setMessage((err as Error).message || 'Action failed');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Manage Booking</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Status"
            value={status}
            onChange={e => setStatus(e.target.value)}
            fullWidth
          >
            <MenuItem value="reschedule">Reschedule</MenuItem>
            <MenuItem value="cancel">Cancel</MenuItem>
            <MenuItem value="no_show">No Show</MenuItem>
            <MenuItem value="visited">Visited</MenuItem>
          </TextField>
          {status === 'reschedule' && (
            <>
              <TextField
                type="date"
                label="Date"
                value={date}
                onChange={e => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: todayStr }}
              />
              <TextField
                select
                label="Time"
                value={slotId}
                onChange={e => setSlotId(e.target.value)}
                disabled={!date || slots.length === 0}
              >
                {slots.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {formatTime(s.startTime)} - {formatTime(s.endTime)}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
          {status === 'cancel' && (
            <TextField
              label="Reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              multiline
              rows={3}
            />
          )}
          {status === 'visited' && (
            <>
              <TextField
                label="Weight With Cart"
                type="number"
                value={weightWithCart}
                onChange={e => setWeightWithCart(e.target.value)}
              />
              <TextField
                label="Cart Tare"
                type="number"
                value={cartTare}
                onChange={e => setCartTare(Number(e.target.value) || 0)}
              />
              <TextField
                label="Weight Without Cart"
                type="number"
                value={weightWithoutCart}
                onChange={e => {
                  setWeightWithoutCart(e.target.value);
                  setAutoWeight(false);
                }}
              />
              <TextField
                label="Pet Item"
                type="number"
                value={petItem}
                onChange={e => setPetItem(e.target.value)}
              />
            </>
          )}
        </Stack>
        <FeedbackSnackbar
          open={!!message}
          onClose={() => setMessage('')}
          message={message}
          severity={severity}
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

