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
import { createClientVisit } from '../api/clientVisits';
import { markBookingVisited } from '../api/bookings';

interface ManageBookingDialogProps {
  open: boolean;
  booking: { id: number; client_id: number; date: string; status: string };
  onClose: () => void;
  onUpdated: () => void;
}

const cartTare = 27;

export default function ManageBookingDialog({
  open,
  booking,
  onClose,
  onUpdated,
}: ManageBookingDialogProps) {
  const [status, setStatus] = useState(booking.status);
  const [weightWithCart, setWeightWithCart] = useState('');
  const [weightWithoutCart, setWeightWithoutCart] = useState('');
  const [petItem, setPetItem] = useState('0');
  const [autoWeight, setAutoWeight] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  } | null>(null);

  useEffect(() => {
    if (autoWeight) {
      setWeightWithoutCart(
        weightWithCart ? String(Number(weightWithCart) - cartTare) : '',
      );
    }
  }, [weightWithCart, autoWeight]);

  useEffect(() => {
    if (!open) {
      setStatus(booking.status);
      setWeightWithCart('');
      setWeightWithoutCart('');
      setPetItem('0');
      setAutoWeight(true);
    }
  }, [open, booking.status]);

  async function handleSave() {
    try {
      if (status === 'visited') {
        await createClientVisit({
          date: booking.date,
          clientId: booking.client_id,
          weightWithCart: Number(weightWithCart),
          weightWithoutCart: Number(weightWithoutCart),
          petItem: Number(petItem),
          anonymous: false,
        });
        await markBookingVisited(booking.id);
      }
      setSnackbar({ open: true, message: 'Booking updated', severity: 'success' });
      onUpdated();
      onClose();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.message || 'Failed to update booking',
        severity: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogCloseButton onClose={onClose} />
      <DialogTitle>Manage Booking</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2} mt={1}>
          <TextField
            select
            label="Status"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <MenuItem value="approved">approved</MenuItem>
            <MenuItem value="visited">visited</MenuItem>
            <MenuItem value="cancelled">cancelled</MenuItem>
          </TextField>
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
                label="Pet Item"
                type="number"
                value={petItem}
                onChange={e => setPetItem(e.target.value)}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleSave}
          disabled={
            status === 'visited' &&
            (!weightWithCart || !weightWithoutCart)
          }
        >
          Save
        </Button>
      </DialogActions>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </Dialog>
  );
}

