import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material/Chip';
import { Link as RouterLink } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import ClientBottomNav from '../../components/ClientBottomNav';
import {
  API_BASE,
  apiFetch,
  getApiErrorMessage,
  handleResponse,
} from '../../api/client';
import type { DeliveryOrder, DeliveryOrderStatus } from '../../types';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

const STATUS_COLOR_MAP: Partial<
  Record<DeliveryOrderStatus, ChipProps['color']>
> = {
  pending: 'warning',
  approved: 'info',
  scheduled: 'info',
  completed: 'success',
  cancelled: 'default',
};

const CANCELLABLE_STATUSES: DeliveryOrder['status'][] = ['pending', 'approved', 'scheduled'];

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function formatDate(value?: string | null, useTime = false): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return useTime ? dateTimeFormatter.format(date) : dateFormatter.format(date);
}

function formatStatusLabel(status?: string | null): string {
  if (!status) {
    return 'Status Unknown';
  }

  return status
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => {
      const normalized = part.toLowerCase();
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(' ');
}

function getStatusColor(status?: DeliveryOrder['status'] | null): ChipProps['color'] {
  if (!status) {
    return 'default';
  }

  return STATUS_COLOR_MAP[status] ?? 'default';
}

function isCancellable(status: DeliveryOrder['status']): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

export default function DeliveryHistory() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'error',
  });
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    const res = await apiFetch(`${API_BASE}/delivery/orders`);
    return handleResponse<DeliveryOrder[]>(res);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadOrders() {
      setLoading(true);
      try {
        const data = await fetchOrders();
        if (active) {
          setOrders(data);
          setError('');
        }
      } catch (err) {
        if (active) {
          const message = getApiErrorMessage(
            err,
            "We couldn't load your delivery history. Please try again.",
          );
          setError(message);
          setSnackbar({ open: true, message, severity: 'error' });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadOrders();
    return () => {
      active = false;
    };
  }, [fetchOrders]);

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleCancel = useCallback(
    async (orderId: number) => {
      setCancellingId(orderId);
      try {
        const res = await apiFetch(`${API_BASE}/delivery/orders/${orderId}/cancel`, {
          method: 'POST',
        });
        await handleResponse(res);
        const data = await fetchOrders();
        setOrders(data);
        setError('');
        setSnackbar({ open: true, message: 'Delivery request cancelled.', severity: 'success' });
      } catch (err) {
        const message = getApiErrorMessage(
          err,
          "We couldn't cancel your delivery request. Please try again.",
        );
        setError(message);
        setSnackbar({ open: true, message, severity: 'error' });
      } finally {
        setCancellingId(null);
      }
    },
    [fetchOrders],
  );

  return (
    <>
      <Container maxWidth="md" sx={{ pt: 4, pb: 12 }}>
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={handleSnackbarClose}
        message={snackbar.message}
        severity={snackbar.severity}
      />

      <Typography variant="h4" component="h1" gutterBottom>
        Delivery History
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Review your previous delivery requests and track their status.
      </Typography>

      {error && (
        <Box mb={3}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Typography variant="h6" gutterBottom>
            No deliveries yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your delivery history will appear here once you submit a request.
          </Typography>
          <Button
            component={RouterLink}
            to="/delivery/book"
            variant="contained"
            size="medium"
          >
            Book a Delivery
          </Button>
        </Box>
      ) : (
        <Stack spacing={3}>
          {orders.map(order => {
            const submittedOn = formatDate(order.createdAt, true);
            const scheduledFor = formatDate(order.scheduledFor ?? undefined, false);
            return (
              <Card key={order.id}>
                <CardHeader
                  title={`Order #${order.id}`}
                  subheader={submittedOn ? `Submitted ${submittedOn}` : undefined}
                  action={
                    <Chip
                      label={formatStatusLabel(order.status)}
                      color={getStatusColor(order.status)}
                    />
                  }
                />
                <CardContent>
                  <Stack spacing={1.5}>
                    {scheduledFor && (
                      <Typography variant="body2" color="text.secondary">
                        Scheduled for {scheduledFor}
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
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle1">Items</Typography>
                    <List dense disablePadding>
                      {order.items.map(item => (
                        <ListItem
                          key={`${order.id}-${item.itemId}`}
                          disableGutters
                          sx={{ py: 0.5 }}
                        >
                          <ListItemText
                            primary={item.name}
                            secondary={`Quantity: ${item.quantity}${
                              item.categoryName ? ` · ${item.categoryName}` : ''
                            }`}
                          />
                        </ListItem>
                      ))}
                    </List>
                    {isCancellable(order.status) && (
                      <LoadingButton
                        variant="outlined"
                        onClick={() => void handleCancel(order.id)}
                        loading={cancellingId === order.id}
                        fullWidth
                      >
                        Cancel request
                      </LoadingButton>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
      </Container>
      <ClientBottomNav />
    </>
  );
}
