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
import { markDeliveryOrderCompleted } from '../../api/deliveryOrders';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

export default function RecordDelivery() {
  const [orderId, setOrderId] = useState('');
  const [inputError, setInputError] = useState('');
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
    setInputError('');

    const trimmed = orderId.trim();
    if (!trimmed) {
      setInputError('Enter the delivery order number.');
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setInputError('Delivery order numbers must be whole numbers.');
      return;
    }

    setSubmitting(true);
    try {
      await markDeliveryOrderCompleted(parsed);
      setSnackbar({
        open: true,
        message: `Delivery order #${parsed} recorded as completed.`,
        severity: 'success',
      });
      setOrderId('');
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

      <Stack spacing={3} sx={{ maxWidth: 560 }}>
        <Typography variant="body1" color="text.secondary">
          Enter a delivery order number to mark the delivery as completed once the
          groceries are dropped off.
        </Typography>

        <Card>
          <CardContent>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  label="Delivery order #"
                  value={orderId}
                  onChange={event => {
                    setOrderId(event.target.value);
                    if (inputError) setInputError('');
                  }}
                  inputMode="numeric"
                  error={!!inputError}
                  helperText={inputError || 'Order numbers are available on the delivery request.'}
                  disabled={submitting}
                  autoFocus
                />
                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={submitting}
                  size="medium"
                >
                  Mark delivery completed
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
