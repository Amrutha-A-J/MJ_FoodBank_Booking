import { useState, useEffect } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Link as MuiLink,
} from '@mui/material';
import type { AlertColor } from '@mui/material';
import DialogCloseButton from './DialogCloseButton';
import FeedbackSnackbar from './FeedbackSnackbar';
import FormDialog from './FormDialog';
import {
  getSlots,
  rescheduleBookingByToken,
  cancelBooking,
  markBookingNoShow,
} from '../api/bookings';
import { createClientVisit } from '../api/clientVisits';
import { formatTime } from '../utils/time';
import { formatReginaDate, toDayjs } from '../utils/date';
import type { Slot, Booking } from '../types';
import getApiErrorMessage from '../utils/getApiErrorMessage';

const CART_TARE = 27;

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
  const [adults, setAdults] = useState('');
  const [children, setChildren] = useState('');
  const [petItem, setPetItem] = useState('0');
  const [note, setNote] = useState('');
  const [autoWeight, setAutoWeight] = useState(true);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const todayStr = formatReginaDate(toDayjs());

  useEffect(() => {
    if (open) {
      setStatus('');
      setDate('');
      setSlots([]);
      setSlotId('');
      setReason('');
      setWeightWithCart('');
      setWeightWithoutCart('');
      setAdults('');
      setChildren('');
      setPetItem('0');
      setNote('');
      setAutoWeight(true);
    }
  }, [open]);

  useEffect(() => {
    if (status === 'reschedule' && date) {
      getSlots(date)
        .then(s => {
          if (date === todayStr) {
            const now = toDayjs();
            s = s.filter(slot =>
              toDayjs(`${date}T${slot.startTime}`).isAfter(now),
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
        .catch(err => {
          console.error(err);
          setSeverity('error');
          setMessage('Failed to load available slots');
          setSlots([]);
        });
    } else {
      setSlots([]);
      setSlotId('');
    }
  }, [status, date, todayStr]);

  useEffect(() => {
    if (status === 'visited' && autoWeight) {
      setWeightWithoutCart(
        weightWithCart ? String(Number(weightWithCart) - CART_TARE) : ''
      );
    }
  }, [status, weightWithCart, autoWeight]);

  async function handleSubmit() {
    try {
      switch (status) {
        case 'reschedule':
          if (!date || !slotId) {
            setSeverity('error');
            setMessage('Please select date and time');
            return;
          }
          if (!booking.reschedule_token) {
            setSeverity('error');
            setMessage('No reschedule token');
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
            clientId: Number(booking.client_id),
            anonymous: false,
            weightWithCart: Number(weightWithCart),
            weightWithoutCart: Number(weightWithoutCart),
            adults: Number(adults || 0),
            children: Number(children || 0),
            petItem: Number(petItem || 0),
            note: note.trim() || undefined,
            verified: false,
          });
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
      setMessage(getApiErrorMessage(err, 'Failed to update booking'));
    }
  }

  return (
    <FormDialog open={open} onClose={onClose} maxWidth="md">
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Manage Booking</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography>Client: {booking.user_name}</Typography>
            <Typography>
              Client ID:{' '}
              <MuiLink href={booking.profile_link} target="_blank" rel="noopener">
                {booking.client_id}
              </MuiLink>
            </Typography>
            <Typography>
              Monthly usage:{' '}
              {Number(booking.visits_this_month) +
                Number(booking.approved_bookings_this_month)}
            </Typography>
            <Typography>
              Visits: {Number(booking.visits_this_month)}, Approved bookings:{' '}
              {Number(booking.approved_bookings_this_month)}
            </Typography>
          </Stack>
          {booking.note && <Typography>Note: {booking.note}</Typography>}
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
                onChange={e => {
                  setWeightWithCart(e.target.value);
                  setAutoWeight(true);
                }}
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
                label="Adults"
                type="number"
                value={adults}
                onChange={e => setAdults(e.target.value)}
              />
              <TextField
                label="Children"
                type="number"
                value={children}
                onChange={e => setChildren(e.target.value)}
              />
              <TextField
                label="Pet Item"
                type="number"
                value={petItem}
                onChange={e => setPetItem(e.target.value)}
              />
              <TextField
                label="Staff Note"
                value={note}
                onChange={e => setNote(e.target.value)}
                multiline
                rows={2}
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
    </FormDialog>
  );
}
