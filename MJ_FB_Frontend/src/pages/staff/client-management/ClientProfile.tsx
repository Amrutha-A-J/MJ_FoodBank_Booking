import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  DialogTitle,
  Divider,
  Stack,
  Typography,
  type AlertColor,
  Button,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import Page from '../../../components/Page';
import PantryQuickLinks from '../../../components/PantryQuickLinks';
import PageCard from '../../../components/layout/PageCard';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import BookingManagementBase from '../../../components/BookingManagementBase';
import { getBookingHistory, cancelBooking, getSlots, rescheduleBookingByToken } from '../../../api/bookings';
import { deleteClientVisit } from '../../../api/clientVisits';
import {
  getUserByClientId,
  type UserByClientId,
} from '../../../api/users';
import { getDeliveryOrdersForClient } from '../../../api/deliveryOrders';
import getApiErrorMessage from '../../../utils/getApiErrorMessage';
import FormDialog from '../../../components/FormDialog';
import DialogCloseButton from '../../../components/DialogCloseButton';
import AccountEditForm, {
  type AccountEditFormData,
} from '../../../components/account/AccountEditForm';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  handleSave as handleDialogSave,
  handleSendReset as handleDialogSendReset,
} from './EditClientDialog';
import type { DeliveryOrder, DeliveryOrderStatus } from '../../../types';
import { formatLocaleDate } from '../../../utils/date';

function formatName(data: UserByClientId | null): string {
  if (!data) return '';
  const parts = [data.firstName?.trim(), data.lastName?.trim()].filter(
    (part): part is string => Boolean(part),
  );
  if (parts.length) return parts.join(' ');
  return `Client ${data.clientId}`;
}

function formatRole(role?: string) {
  if (!role) return '—';
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

interface ProfileDetailProps {
  label: string;
  value: string;
}

function ProfileDetail({ label, value }: ProfileDetailProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
    </Stack>
  );
}

function getStatusColor(
  status?: DeliveryOrderStatus | null,
): 'default' | 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'approved':
      return 'info';
    case 'scheduled':
      return 'warning';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

function formatStatusLabel(status?: DeliveryOrderStatus | null) {
  if (!status) return 'Pending';
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function DeliveryOrderSummary({ order }: { order: DeliveryOrder }) {
  const scheduledLabel = order.scheduledFor
    ? formatLocaleDate(order.scheduledFor, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not scheduled';

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography variant="subtitle1">{`Order #${order.id}`}</Typography>
        <Chip
          size="small"
          label={formatStatusLabel(order.status)}
          color={getStatusColor(order.status)}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {`Scheduled: ${scheduledLabel}`}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {`Address: ${order.address}`}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {`Phone: ${order.phone}`}
      </Typography>
      {order.email && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {`Email: ${order.email}`}
        </Typography>
      )}
      {order.notes && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {`Notes: ${order.notes}`}
        </Typography>
      )}
      <Typography variant="subtitle2" sx={{ mt: 1 }}>
        Items
      </Typography>
      {order.items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No items recorded
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {order.items.map((item, index) => (
            <Typography key={`${order.id}-${item.itemId ?? index}`} variant="body2">
              {`${item.itemName || item.name || 'Item'} × ${item.quantity}`}
              {item.categoryName ? ` · ${item.categoryName}` : ''}
            </Typography>
          ))}
        </Stack>
      )}
    </Box>
  );
}

type SnackbarState = { message: string; severity: AlertColor } | null;

const defaultAccountData: AccountEditFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  onlineAccess: false,
  password: '',
  hasPassword: false,
};

export default function ClientProfile() {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const parsedId = clientIdParam ? Number(clientIdParam) : NaN;

  const [client, setClient] = useState<UserByClientId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [activeDeliveryOrders, setActiveDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [completedDeliveryOrders, setCompletedDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const loadClient = useCallback(async () => {
    if (!clientIdParam || Number.isNaN(parsedId)) {
      setError('Client not found');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await getUserByClientId(clientIdParam);
      setClient(data);
      setName(formatName(data));
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to load client');
      setError(message);
      setSnackbar({ message, severity: 'error' });
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientIdParam, parsedId]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  useEffect(() => {
    if (!client || client.role !== 'delivery') {
      setActiveDeliveryOrders([]);
      setCompletedDeliveryOrders([]);
      setDeliveryLoading(false);
      setDeliveryError(null);
      setCompletedExpanded(false);
      return;
    }

    let active = true;
    setDeliveryLoading(true);
    setDeliveryError(null);

    getDeliveryOrdersForClient(client.clientId)
      .then(orders => {
        if (!active) return;
        const activeStatuses: DeliveryOrderStatus[] = [
          'pending',
          'approved',
          'scheduled',
        ];
        const pendingOrders: DeliveryOrder[] = [];
        const finishedOrders: DeliveryOrder[] = [];
        orders.forEach(order => {
          if (!order.status || activeStatuses.includes(order.status)) {
            pendingOrders.push(order);
          } else {
            finishedOrders.push(order);
          }
        });
        setActiveDeliveryOrders(pendingOrders);
        setCompletedDeliveryOrders(finishedOrders);
        setCompletedExpanded(false);
      })
      .catch(err => {
        if (!active) return;
        const message = getApiErrorMessage(err, 'Unable to load delivery orders');
        setDeliveryError(message);
        setActiveDeliveryOrders([]);
        setCompletedDeliveryOrders([]);
        setSnackbar({ message, severity: 'error' });
      })
      .finally(() => {
        if (active) {
          setDeliveryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [client]);

  const accountInitialData = useMemo<AccountEditFormData>(() => {
    if (!client) return defaultAccountData;
    return {
      firstName: client.firstName ?? '',
      lastName: client.lastName ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      onlineAccess: Boolean(client.onlineAccess),
      password: '',
      hasPassword: client.hasPassword,
    };
  }, [client]);

  const usageLabel = useMemo(() => {
    if (!client || client.bookingsThisMonth == null) return null;
    const count = client.bookingsThisMonth;
    return `${count} use${count === 1 ? '' : 's'} this month`;
  }, [client]);

  return (
    <Page title="Client profile" header={<PantryQuickLinks />}>
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : !client ? (
        <Typography color="text.secondary">Client not found.</Typography>
      ) : (
        <Stack spacing={3}>
          <PageCard>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
              >
                <Typography variant="h4">{name}</Typography>
                {usageLabel && <Chip label={usageLabel} color="primary" />}
              </Stack>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <ProfileDetail label="Client ID" value={String(client.clientId)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <ProfileDetail label="Role" value={formatRole(client.role)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <ProfileDetail label="Email" value={client.email || '—'} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <ProfileDetail label="Phone" value={client.phone || '—'} />
                </Grid>
                {client.address && (
                  <Grid item xs={12}>
                    <ProfileDetail label="Address" value={client.address} />
                  </Grid>
                )}
                <Grid item xs={12} sm={6} md={4}>
                  <ProfileDetail
                    label="Online access"
                    value={client.onlineAccess ? 'Enabled' : 'Disabled'}
                  />
                </Grid>
              </Grid>
            </Stack>
          </PageCard>

          <PageCard>
            <BookingManagementBase
              user={{
                client_id: client.clientId,
                name,
              }}
              getBookingHistory={getBookingHistory}
              cancelBooking={cancelBooking}
              rescheduleBookingByToken={rescheduleBookingByToken}
              getSlots={getSlots}
              onDeleteVisit={deleteClientVisit}
              showNotes
              showUserHeading={false}
              retentionNotice="Bookings, cancellations, and visits older than one year are removed from history."
              renderEditDialog={({ open, onClose, onUpdated }) => (
                <FormDialog open={open} onClose={onClose}>
                  <DialogCloseButton onClose={onClose} />
                  <DialogTitle>Edit Client</DialogTitle>
                  <AccountEditForm
                    open={open}
                    initialData={accountInitialData}
                    onSave={async data => {
                      const ok = await handleDialogSave(
                        client.clientId,
                        data,
                        updatedName => {
                          setName(updatedName);
                        },
                        onUpdated,
                        onClose,
                      );
                      if (ok) {
                        await loadClient();
                      }
                      return ok;
                    }}
                    onSecondaryAction={async data => {
                      const ok = await handleDialogSendReset(
                        client.clientId,
                        data,
                        updatedName => {
                          setName(updatedName);
                        },
                        onUpdated,
                        onClose,
                      );
                      if (ok) {
                        await loadClient();
                      }
                    }}
                    secondaryActionLabel="Send password reset link"
                    onlineAccessHelperText="Allow the client to sign in online."
                    existingPasswordTooltip="Client already has a password"
                    secondaryActionTestId="send-reset-button"
                    titleAdornment={data =>
                      data.hasPassword ? (
                        <Chip
                          color="success"
                          icon={<CheckCircleOutline />}
                          label="Online account"
                          data-testid="online-badge"
                        />
                      ) : null
                    }
                    draftKey={`client-profile-${client.clientId}`}
                  />
                </FormDialog>
              )}
              renderDeleteVisitButton={(booking, isSmall, open) =>
                booking.status === 'visited' && !booking.slot_id ? (
                  <Button
                    key="deleteVisit"
                    onClick={open}
                    variant="outlined"
                    color="error"
                    fullWidth={isSmall}
                  >
                    Delete visit
                  </Button>
                ) : null
              }
            />
          </PageCard>
          {client.role === 'delivery' && (
            <PageCard>
              <Stack spacing={3}>
                <Stack spacing={0.5}>
                  <Typography variant="h6">Delivery history</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review hamper requests
                  </Typography>
                </Stack>
                {deliveryLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : deliveryError ? (
                  <Typography color="error">{deliveryError}</Typography>
                ) : (
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        Active deliveries
                      </Typography>
                      {activeDeliveryOrders.length === 0 ? (
                        <Typography color="text.secondary">
                          No active delivery requests right now.
                        </Typography>
                      ) : (
                        <Stack spacing={2} divider={<Divider flexItem />}>
                          {activeDeliveryOrders.map(order => (
                            <DeliveryOrderSummary key={order.id} order={order} />
                          ))}
                        </Stack>
                      )}
                    </Box>
                    <Accordion
                      expanded={completedExpanded}
                      onChange={(_, expanded) => setCompletedExpanded(expanded)}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">
                          {completedExpanded
                            ? 'Hide completed deliveries'
                            : 'Show completed deliveries'}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {completedDeliveryOrders.length === 0 ? (
                          <Typography color="text.secondary">
                            No completed deliveries yet.
                          </Typography>
                        ) : (
                          <Stack spacing={2} divider={<Divider flexItem />}>
                            {completedDeliveryOrders.map(order => (
                              <DeliveryOrderSummary key={order.id} order={order} />
                            ))}
                          </Stack>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  </Stack>
                )}
              </Stack>
            </PageCard>
          )}
        </Stack>
      )}

      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message ?? ''}
        severity={snackbar?.severity}
      />
    </Page>
  );
}
