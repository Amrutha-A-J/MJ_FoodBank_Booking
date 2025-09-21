import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
  Button,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Link as RouterLink } from 'react-router-dom';
import Page from '../../components/Page';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getApiErrorMessage } from '../../api/client';
import { createDeliveryOrder } from '../../api/deliveryOrders';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

type FormErrors = {
  clientId?: string;
  address?: string;
  phone?: string;
  email?: string;
  scheduledFor?: string;
  notes?: string;
};

const PHONE_REGEX = /^\+?[0-9 ()-]{7,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RecordDelivery() {
  const [clientId, setClientId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: FormErrors = {};

    const trimmedClientId = clientId.trim();
    const parsedClientId = Number(trimmedClientId);
    if (!trimmedClientId) {
      errors.clientId = 'Enter the client ID.';
    } else if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) {
      errors.clientId = 'Client IDs must be whole numbers.';
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      errors.address = 'Enter the delivery address.';
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errors.phone = 'Enter the contact phone number.';
    } else if (!PHONE_REGEX.test(trimmedPhone)) {
      errors.phone = 'Enter a valid phone number.';
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Enter a valid email address.';
    }

    const trimmedNotes = notes.trim();
    if (trimmedNotes.length > 1000) {
      errors.notes = 'Notes must be 1000 characters or less.';
    }

    let scheduledForIso: string | null = null;
    if (scheduledFor.trim()) {
      const parsedDate = new Date(scheduledFor);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.scheduledFor = 'Enter a valid delivery date and time.';
      } else {
        scheduledForIso = parsedDate.toISOString();
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    try {
      await createDeliveryOrder({
        clientId: parsedClientId,
        address: trimmedAddress,
        phone: trimmedPhone,
        email: trimmedEmail || null,
        notes: trimmedNotes || null,
        scheduledFor: scheduledForIso,
        status: 'completed',
        selections: [],
      });
      setSnackbar({
        open: true,
        message: `Delivery recorded for client ${parsedClientId}.`,
        severity: 'success',
      });
      setClientId('');
      setAddress('');
      setPhone('');
      setEmail('');
      setScheduledFor('');
      setNotes('');
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        'We could not record this delivery. Please try again.',
      );
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page title="Record Delivery" header={<PantryQuickLinks />}>
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={handleSnackbarClose}
        message={snackbar.message}
        severity={snackbar.severity}
      />

      <Stack spacing={3} sx={{ maxWidth: 720 }}>
        <Typography variant="body1" color="text.secondary">
          Record deliveries made outside the queue by entering the client and contact
          information. Deliveries submitted here are stored as completed requests in
          the client history.
        </Typography>

        <Card>
          <CardContent>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  label="Client ID"
                  value={clientId}
                  onChange={event => {
                    setClientId(event.target.value);
                    if (formErrors.clientId) {
                      setFormErrors(prev => ({ ...prev, clientId: undefined }));
                    }
                  }}
                  inputMode="numeric"
                  error={!!formErrors.clientId}
                  helperText={formErrors.clientId || 'Enter the numeric client ID.'}
                  disabled={submitting}
                  autoFocus
                  required
                />
                <TextField
                  label="Delivery address"
                  value={address}
                  onChange={event => {
                    setAddress(event.target.value);
                    if (formErrors.address) {
                      setFormErrors(prev => ({ ...prev, address: undefined }));
                    }
                  }}
                  error={!!formErrors.address}
                  helperText={formErrors.address || 'Include apartment or buzzer details if needed.'}
                  disabled={submitting}
                  required
                  multiline
                  minRows={2}
                />
                <TextField
                  label="Phone number"
                  value={phone}
                  onChange={event => {
                    setPhone(event.target.value);
                    if (formErrors.phone) {
                      setFormErrors(prev => ({ ...prev, phone: undefined }));
                    }
                  }}
                  error={!!formErrors.phone}
                  helperText={formErrors.phone || 'Use a number the driver can reach day-of.'}
                  disabled={submitting}
                  required
                />
                <TextField
                  label="Email"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    if (formErrors.email) {
                      setFormErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  error={!!formErrors.email}
                  helperText={formErrors.email || 'Optional but helps with confirmations.'}
                  disabled={submitting}
                />
                <TextField
                  label="Scheduled for"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={event => {
                    setScheduledFor(event.target.value);
                    if (formErrors.scheduledFor) {
                      setFormErrors(prev => ({ ...prev, scheduledFor: undefined }));
                    }
                  }}
                  error={!!formErrors.scheduledFor}
                  helperText={
                    formErrors.scheduledFor ||
                    'Optional — set when the delivery has a confirmed time.'
                  }
                  disabled={submitting}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Notes"
                  value={notes}
                  onChange={event => {
                    setNotes(event.target.value);
                    if (formErrors.notes) {
                      setFormErrors(prev => ({ ...prev, notes: undefined }));
                    }
                  }}
                  error={!!formErrors.notes}
                  helperText={
                    formErrors.notes || 'Optional — share quick delivery details for the client.'
                  }
                  disabled={submitting}
                  multiline
                  minRows={3}
                />
                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={submitting}
                  size="medium"
                >
                  Record delivery
                </LoadingButton>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Button
          component={RouterLink}
          to="/pantry/deliveries"
          variant="text"
          size="medium"
          sx={{ alignSelf: 'flex-start' }}
        >
          Back to outstanding deliveries
        </Button>
      </Stack>
    </Page>
  );
}
