import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  type AlertColor,
} from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Page from '../../../components/Page';
import PantryQuickLinks from '../../../components/PantryQuickLinks';
import PageCard from '../../../components/layout/PageCard';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import BookingManagementBase from '../../../components/BookingManagementBase';
import AccountEditForm, {
  type AccountEditFormData,
} from '../../../components/account/AccountEditForm';
import FormDialog from '../../../components/FormDialog';
import DialogCloseButton from '../../../components/DialogCloseButton';
import {
  cancelBooking,
  getBookingHistory,
  getSlots,
  rescheduleBookingByToken,
} from '../../../api/bookings';
import { deleteClientVisit } from '../../../api/clientVisits';
import { getUserByClientId, type UserByClientId } from '../../../api/users';
import { handleSave, handleSendReset } from './EditClientDialog';
import getApiErrorMessage from '../../../utils/getApiErrorMessage';
import { getDeliveryOrdersForClient } from '../../../api/deliveryOrders';
import type { DeliveryOrder, DeliveryOrderStatus } from '../../../types';
import { formatLocaleDate } from '../../../utils/date';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: AlertColor;
};

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
        <List dense disablePadding>
          {order.items.map((item, index) => (
            <ListItem key={`${order.id}-${item.itemId ?? index}`} disableGutters sx={{ py: 0 }}>
              <ListItemText
                primary={`${item.itemName || item.name || 'Item'} × ${item.quantity}`}
                secondary={item.categoryName ?? undefined}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

interface ProfileDetailProps {
  label: string;
  value: string;
  testId?: string;
}

function ProfileDetail({ label, value, testId }: ProfileDetailProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" data-testid={testId}>
        {value}
      </Typography>
    </Stack>
  );
}

function formatRole(role: UserByClientId['role']) {
  switch (role) {
    case 'shopper':
      return 'Pantry shopper';
    case 'delivery':
      return 'Delivery client';
    default:
      return 'Client';
  }
}

export default function ClientProfile() {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<UserByClientId | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const [activeDeliveryOrders, setActiveDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [completedDeliveryOrders, setCompletedDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const parsedId = clientId ? Number(clientId) : NaN;
  const validId = Number.isInteger(parsedId) ? String(parsedId) : null;

  const handleSnackbar = useCallback((message: string, severity: AlertColor) => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => (prev ? { ...prev, open: false } : prev));
  }, []);

  const loadClient = useCallback(async () => {
    if (!validId) {
      setClient(null);
      setLoadError('Client not found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const data = await getUserByClientId(validId);
      setClient(data);
    } catch (err) {
      setClient(null);
      setLoadError('Unable to load client');
      handleSnackbar(getApiErrorMessage(err, 'Unable to load client'), 'error');
    } finally {
      setLoading(false);
    }
  }, [validId, handleSnackbar]);

  const refreshClient = useCallback(async () => {
    if (!validId) return;
    try {
      const data = await getUserByClientId(validId);
      setClient(data);
    } catch (err) {
      handleSnackbar(getApiErrorMessage(err, 'Failed to refresh client'), 'error');
    }
  }, [validId, handleSnackbar]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  useEffect(() => {
    if (!client || client.role !== 'delivery') {
      setActiveDeliveryOrders([]);
      setCompletedDeliveryOrders([]);
      setDeliveryError(null);
      setDeliveryLoading(false);
      setCompletedExpanded(false);
      return;
    }

    let active = true;
    setDeliveryLoading(true);
    setDeliveryError(null);

    getDeliveryOrdersForClient(client.clientId)
      .then(orders => {
        if (!active) return;
        const activeStatuses: DeliveryOrderStatus[] = ['pending', 'approved', 'scheduled'];
        const activeOrders: DeliveryOrder[] = [];
        const completedOrders: DeliveryOrder[] = [];
        orders.forEach(order => {
          if (!order.status || activeStatuses.includes(order.status)) {
            activeOrders.push(order);
          } else {
            completedOrders.push(order);
          }
        });
        setActiveDeliveryOrders(activeOrders);
        setCompletedDeliveryOrders(completedOrders);
        setCompletedExpanded(false);
      })
      .catch(err => {
        if (!active) return;
        setActiveDeliveryOrders([]);
        setCompletedDeliveryOrders([]);
        setDeliveryError(getApiErrorMessage(err, 'Unable to load delivery orders'));
      })
      .finally(() => {
        if (active) setDeliveryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client]);

  const displayName = useMemo(() => {
    if (!client) return '';
    const name = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim();
    if (name) return name;
    return `Client #${client.clientId}`;
  }, [client]);

  const accountInitialData = useMemo<AccountEditFormData>(() => ({
    firstName: client?.firstName || '',
    lastName: client?.lastName || '',
    email: client?.email || '',
    phone: client?.phone || '',
    onlineAccess: Boolean(client?.onlineAccess),
    password: '',
    hasPassword: Boolean(client?.hasPassword),
  }), [
    client?.firstName,
    client?.lastName,
    client?.email,
    client?.phone,
    client?.onlineAccess,
    client?.hasPassword,
  ]);

  const retentionNotice = (
    'Bookings, cancellations, and visits older than one year are removed from history.'
  );

  const draftKey = client ? `client-profile-${client.clientId}` : undefined;

  const title = client ? `${displayName} · Client Profile` : 'Client Profile';

  return (
    <Page title={title} header={<PantryQuickLinks />}> 
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading client" />
        </Box>
      ) : loadError ? (
        <Typography color="error" variant="body1">
          {loadError}
        </Typography>
      ) : !client ? (
        <Typography variant="body1">Client not found.</Typography>
      ) : (
        <Stack spacing={2}>
          <PageCard>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h5" data-testid="client-name">
                    {displayName}
                  </Typography>
                  {client.hasPassword && (
                    <Chip
                      icon={<CheckCircleOutline fontSize="small" />}
                      label="Online account"
                      color="success"
                      size="small"
                      variant="outlined"
                      data-testid="online-account-chip"
                    />
                  )}
                  <Chip
                    label={`${client.bookingsThisMonth ?? 0} uses this month`}
                    color="info"
                    size="small"
                    variant="outlined"
                    data-testid="monthly-usage-chip"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Client ID #{client.clientId}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {formatRole(client.role)}
                </Typography>
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                <ProfileDetail
                  label="Email"
                  value={client.email || 'Not provided'}
                  testId="client-email"
                />
                <ProfileDetail
                  label="Phone"
                  value={client.phone || 'Not provided'}
                  testId="client-phone"
                />
                <ProfileDetail
                  label="Address"
                  value={client.address || 'Not provided'}
                />
              </Box>
            </Stack>
          </PageCard>

          <PageCard>
            <BookingManagementBase
              user={{ name: displayName, client_id: client.clientId }}
              getBookingHistory={getBookingHistory}
              cancelBooking={cancelBooking}
              rescheduleBookingByToken={rescheduleBookingByToken}
              getSlots={getSlots}
              onDeleteVisit={deleteClientVisit}
              showNotes
              showUserHeading={false}
              retentionNotice={retentionNotice}
              renderEditDialog={({ open, onClose, onUpdated }) => (
                <FormDialog open={open} onClose={onClose}>
                  <DialogCloseButton onClose={onClose} />
                  <Typography component="h2" variant="h6" sx={{ px: 3, pt: 3 }}>
                    Edit Client
                  </Typography>
                  <AccountEditForm
                    open={open}
                    initialData={accountInitialData}
                    onSave={async data => {
                      if (!client) return false;
                      const showFeedback = (message: string, severity: AlertColor) => {
                        onUpdated(message, severity);
                        handleSnackbar(message, severity);
                      };
                      const saved = await handleSave(
                        client.clientId,
                        data,
                        () => undefined,
                        showFeedback,
                        onClose,
                      );
                      if (saved) {
                        await refreshClient();
                      }
                      return saved;
                    }}
                    onSecondaryAction={async data => {
                      if (!client) return;
                      const showFeedback = (message: string, severity: AlertColor) => {
                        onUpdated(message, severity);
                        handleSnackbar(message, severity);
                      };
                      const saved = await handleSendReset(
                        client.clientId,
                        data,
                        () => undefined,
                        showFeedback,
                        onClose,
                      );
                      if (saved) {
                        await refreshClient();
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
                          data-testid="dialog-online-badge"
                        />
                      ) : null
                    }
                    draftKey={draftKey}
                  />
                </FormDialog>
              )}
              renderDeleteVisitButton={(booking, isSmall, openDelete) =>
                booking.status === 'visited' && !booking.slot_id ? (
                  <Button
                    key="deleteVisit"
                    onClick={openDelete}
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
                <Typography variant="h6">Delivery history</Typography>
                {deliveryLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} aria-label="Loading delivery history" />
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
        open={Boolean(snackbar?.open)}
        message={snackbar?.message ?? ''}
        severity={snackbar?.severity}
        onClose={closeSnackbar}
      />
    </Page>
  );
}
