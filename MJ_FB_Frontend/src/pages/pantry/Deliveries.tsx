import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Link as RouterLink } from 'react-router-dom';
import Page from '../../components/Page';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getApiErrorMessage } from '../../api/client';
import {
  getOutstandingDeliveryOrders,
  markDeliveryOrderCompleted,
} from '../../api/deliveryOrders';
import type { DeliveryOutstandingOrder } from '../../types';

const submittedFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return submittedFormatter.format(date);
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dateFormatter.format(date);
}

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

type CompletionDialogState = {
  open: boolean;
  order: DeliveryOutstandingOrder | null;
  weight: string;
  submitting: boolean;
  error: string;
};

const initialCompletionDialogState: CompletionDialogState = {
  open: false,
  order: null,
  weight: '',
  submitting: false,
  error: '',
};

export default function Deliveries() {
  const [orders, setOrders] = useState<DeliveryOutstandingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [completionDialog, setCompletionDialog] = useState<CompletionDialogState>({
    ...initialCompletionDialogState,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    getOutstandingDeliveryOrders()
      .then(data => {
        if (!active) return;
        setOrders(data);
        setError('');
      })
      .catch(err => {
        if (!active) return;
        const message = getApiErrorMessage(
          err,
          'We could not load outstanding delivery orders. Please try again.',
        );
        setError(message);
        setSnackbar({ open: true, message, severity: 'error' });
        setOrders([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleOpenCompleteDialog = useCallback((order: DeliveryOutstandingOrder) => {
    setCompletionDialog({
      open: true,
      order,
      weight: '',
      submitting: false,
      error: '',
    });
  }, []);

  const handleCompletionWeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setCompletionDialog(prev => ({ ...prev, weight: value, error: '' }));
  };

  const handleCloseCompletionDialog = () => {
    if (completionDialog.submitting) return;
    setCompletionDialog(() => ({ ...initialCompletionDialogState }));
  };

  const handleCompleteSubmit = async () => {
    if (!completionDialog.order) return;
    const trimmed = completionDialog.weight.trim();
    if (!trimmed) {
      setCompletionDialog(prev => ({
        ...prev,
        error: 'Enter the delivered weight.',
      }));
      return;
    }

    const parsedWeight = Number(trimmed);
    if (!Number.isFinite(parsedWeight) || parsedWeight < 0) {
      setCompletionDialog(prev => ({
        ...prev,
        error: 'Enter a valid weight of 0 or more.',
      }));
      return;
    }

    const orderId = completionDialog.order.id;
    setCompletionDialog(prev => ({ ...prev, submitting: true, error: '' }));

    try {
      await markDeliveryOrderCompleted(orderId, parsedWeight);
      setOrders(prev => prev.filter(order => order.id !== orderId));
      setError('');
      setSnackbar({
        open: true,
        message: 'Delivery marked completed.',
        severity: 'success',
      });
      setCompletionDialog(() => ({ ...initialCompletionDialogState }));
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        'We could not mark this delivery as completed. Please try again.',
      );
      setCompletionDialog(prev => ({ ...prev, submitting: false }));
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  return (
    <Page title="Delivery Orders" header={<PantryQuickLinks />}>
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={handleSnackbarClose}
        message={snackbar.message}
        severity={snackbar.severity}
      />

      <Dialog
        open={completionDialog.open}
        onClose={completionDialog.submitting ? undefined : handleCloseCompletionDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Record delivery weight</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Enter the total pounds delivered so we can log this visit.
          </Typography>
          <TextField
            autoFocus
            margin="normal"
            label="Weight (lb)"
            type="number"
            value={completionDialog.weight}
            onChange={handleCompletionWeightChange}
            fullWidth
            size="medium"
            inputProps={{ min: 0, step: 0.1 }}
            error={Boolean(completionDialog.error)}
            helperText={
              completionDialog.error ||
              'Record the pounds of food delivered to the client.'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompletionDialog} disabled={completionDialog.submitting}>
            Cancel
          </Button>
          <LoadingButton
            onClick={() => void handleCompleteSubmit()}
            variant="contained"
            loading={completionDialog.submitting}
          >
            Save weight &amp; complete
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mb: 3 }}
      >
        <Typography variant="body1" color="text.secondary">
          Review outstanding delivery requests and close them once a delivery is completed.
        </Typography>
        <Button
          component={RouterLink}
          to="/pantry/deliveries/record"
          variant="contained"
          size="medium"
        >
          Record Delivery
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Typography variant="h6" gutterBottom>
            {error ? 'No deliveries to display' : 'No outstanding deliveries'}
          </Typography>
          <Typography color="text.secondary">
            {error
              ? 'Resolve the issue above and refresh to try again.'
              : 'New delivery requests will appear here once they are submitted.'}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={3}>
          {orders.map(order => {
            const submittedOn = formatDateTime(order.createdAt);
            const scheduledFor = formatDate(order.scheduledFor);
            const clientLabel = order.clientName
              ? `Client ${order.clientId} · ${order.clientName}`
              : `Client ${order.clientId}`;

            return (
              <Card key={order.id}>
                <CardHeader
                  title={clientLabel}
                  subheader={submittedOn ? `Submitted ${submittedOn}` : undefined}
                />
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant="body2">
                      <strong>Order #:</strong> {order.id}
                    </Typography>
                    {scheduledFor && (
                      <Typography variant="body2">
                        <strong>Scheduled for:</strong> {scheduledFor}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      <strong>Address:</strong> {order.address}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Phone:</strong> {order.phone}
                    </Typography>
                    {order.email && (
                      <Typography variant="body2">
                        <strong>Email:</strong> {order.email}
                      </Typography>
                    )}
                    {order.notes && (
                      <Typography variant="body2" color="text.secondary">
                        {order.notes}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="subtitle1">Items</Typography>
                    {order.items.length > 0 ? (
                      <List dense sx={{ py: 0 }}>
                        {order.items.map(item => {
                          const itemName = item.name || item.itemName || 'Item';
                          return (
                            <ListItem
                              key={`${order.id}-${item.itemId}-${itemName}`}
                              disableGutters
                              sx={{ py: 0.5 }}
                            >
                              <ListItemText
                                primary={`${item.quantity} × ${itemName}`}
                                secondary={item.categoryName ?? undefined}
                              />
                            </ListItem>
                          );
                        })}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No items listed.
                      </Typography>
                    )}

                    <Box>
                      <Button
                        variant="contained"
                        onClick={() => handleOpenCompleteDialog(order)}
                        size="medium"
                      >
                        Mark Completed
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Page>
  );
}
