import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  getBookingHistory,
  cancelBooking,
  getSlots,
  rescheduleBookingByToken,
} from '../../../api/bookings';
import { deleteClientVisit } from '../../../api/clientVisits';
import { getDeliveryOrdersForClient } from '../../../api/deliveryOrders';
import { getUserByClientId } from '../../../api/users';
import EntitySearch from '../../../components/EntitySearch';
import BookingManagementBase from '../../../components/BookingManagementBase';
import EditClientDialog from './EditClientDialog';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useAuth } from '../../../hooks/useAuth';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import getApiErrorMessage from '../../../utils/getApiErrorMessage';
import { formatLocaleDate } from '../../../utils/date';
import type { DeliveryOrder, DeliveryOrderStatus, UserRole } from '../../../types';

interface User {
  name: string;
  client_id: number;
  role?: UserRole;
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

export default function UserHistory({
  initialUser,
}: {
  initialUser?: User;
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<User | null>(
    initialUser ? { ...initialUser } : null,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(
    initialUser?.role ?? null,
  );
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const { role } = useAuth();
  const showNotes = role === 'staff';

  useEffect(() => {
    if (initialUser) return;
    const name = searchParams.get('name');
    const clientId = searchParams.get('clientId');
    if (name && clientId) {
      setSelected({ name, client_id: Number(clientId) });
      setSelectedRole(null);
    }
  }, [searchParams, initialUser]);

  useEffect(() => {
    if (!selected) {
      setSelectedRole(null);
      setRoleError(null);
      setRoleLoading(false);
      return;
    }

    if (selected.role) {
      setSelectedRole(selected.role);
      setRoleError(null);
      setRoleLoading(false);
      return;
    }

    if (
      initialUser &&
      initialUser.role &&
      initialUser.client_id === selected.client_id
    ) {
      setSelectedRole(initialUser.role);
      setRoleError(null);
      setRoleLoading(false);
      return;
    }

    if (role !== 'staff') {
      setRoleError(null);
      setRoleLoading(false);
      return;
    }

    let active = true;
    setRoleLoading(true);
    setRoleError(null);

    getUserByClientId(String(selected.client_id))
      .then(user => {
        if (!active) return;
        setSelectedRole(user.role);
        setSelected(prev => (prev ? { ...prev, role: user.role } : prev));
      })
      .catch(err => {
        if (!active) return;
        setSelectedRole(null);
        setRoleError(
          getApiErrorMessage(err, 'Unable to load client details'),
        );
      })
      .finally(() => {
        if (active) setRoleLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selected, role, initialUser]);

  useEffect(() => {
    if (!selected || role !== 'staff' || selectedRole !== 'delivery') {
      setDeliveryOrders([]);
      setDeliveryLoading(false);
      setDeliveryError(null);
      return;
    }

    let active = true;
    setDeliveryLoading(true);
    setDeliveryError(null);

    getDeliveryOrdersForClient(selected.client_id)
      .then(orders => {
        if (!active) return;
        setDeliveryOrders(orders);
      })
      .catch(err => {
        if (!active) return;
        setDeliveryOrders([]);
        setDeliveryError(
          getApiErrorMessage(err, 'Unable to load delivery orders'),
        );
      })
      .finally(() => {
        if (active) setDeliveryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selected?.client_id, role, selectedRole]);

  const handleSelect = (u: User) => {
    const user = { ...u };
    setSelected(user);
    setSelectedRole(user.role ?? null);
    setRoleError(null);
  };

  const shouldShowRoleSpinner =
    role === 'staff' && roleLoading && !selectedRole && !!selected;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {initialUser ? 'Client booking history' : 'Client history'}
      </Typography>
      <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
        <Box width="100%" maxWidth={1200} mt={4}>
          {!initialUser && (
            <EntitySearch
              type="user"
              placeholder="Search by name or client ID"
              onSelect={u => handleSelect(u as User)}
              onNotFound={id => {
                (document.activeElement as HTMLElement | null)?.blur();
                setPendingId(id);
              }}
            />
          )}
          {selected && (
            <Grid
              container
              spacing={3}
              alignItems="flex-start"
              sx={{ mt: initialUser ? 0 : 2 }}
            >
              <Grid item xs={12}>
                {shouldShowRoleSpinner ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={24} />
                  </Box>
                ) : selectedRole === 'delivery' ? (
                  <Card>
                    <CardHeader
                      title="Delivery history"
                      subheader="Review hamper requests"
                    />
                    <CardContent>
                      {deliveryLoading ? (
                        <Box display="flex" justifyContent="center" py={2}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : deliveryError ? (
                        <Typography color="error">{deliveryError}</Typography>
                      ) : deliveryOrders.length === 0 ? (
                        <Typography color="text.secondary">
                          No delivery orders yet
                        </Typography>
                      ) : (
                        <Stack spacing={2} divider={<Divider flexItem />}>
                          {deliveryOrders.map(order => (
                            <DeliveryOrderSummary key={order.id} order={order} />
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {roleError && (
                      <Box mb={2}>
                        <Typography color="error">{roleError}</Typography>
                      </Box>
                    )}
                    <BookingManagementBase
                      user={selected}
                      getBookingHistory={getBookingHistory}
                      cancelBooking={cancelBooking}
                      rescheduleBookingByToken={rescheduleBookingByToken}
                      getSlots={getSlots}
                      onDeleteVisit={deleteClientVisit}
                      showNotes={showNotes}
                      showFilter={!initialUser}
                      showUserHeading={!initialUser}
                      renderEditDialog={
                        role === 'staff'
                          ? ({ open, onClose, onUpdated }) => (
                              <EditClientDialog
                                open={open}
                                clientId={selected.client_id}
                                onClose={onClose}
                                onUpdated={onUpdated}
                                onClientUpdated={name =>
                                  setSelected({ ...selected, name })
                                }
                              />
                            )
                          : undefined
                      }
                      renderDeleteVisitButton={(b, isSmall, open) =>
                        role === 'staff' && b.status === 'visited' && !b.slot_id ? (
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
                  </>
                )}
              </Grid>
            </Grid>
          )}
        </Box>
      </Box>
      {pendingId && (
        <ConfirmDialog
          message={`Add client ${pendingId}?`}
          onConfirm={() => {
            navigate(`/pantry/client-management?tab=add&clientId=${pendingId}`);
            setPendingId(null);
          }}
          onCancel={() => setPendingId(null)}
        />
      )}
    </Box>
  );
}

