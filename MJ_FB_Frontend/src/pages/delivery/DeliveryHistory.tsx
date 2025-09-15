import { useEffect, useState } from 'react';
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
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  API_BASE,
  apiFetch,
  getApiErrorMessage,
  handleResponse,
} from '../../api/client';
import type { DeliveryOrder } from '../../types';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

const STATUS_COLOR_MAP: Partial<
  Record<DeliveryOrder['status'], ChipProps['color']>
> = {
  pending: 'warning',
  approved: 'info',
  scheduled: 'info',
  completed: 'success',
  cancelled: 'default',
};

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

function formatStatusLabel(status: string): string {
  return status
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getStatusColor(status: DeliveryOrder['status']): ChipProps['color'] {
  return STATUS_COLOR_MAP[status] ?? 'default';
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

  useEffect(() => {
    let active = true;
    async function loadOrders() {
      setLoading(true);
      try {
        const res = await apiFetch(`${API_BASE}/delivery/orders`);
        const data = await handleResponse<DeliveryOrder[]>(res);
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
  }, []);

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
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
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Container>
  );
}
