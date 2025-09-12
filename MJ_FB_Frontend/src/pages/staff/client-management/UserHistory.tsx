import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  getBookingHistory,
  cancelBooking,
  getSlots,
  rescheduleBookingByToken,
} from '../../../api/bookings';
import { deleteClientVisit } from '../../../api/clientVisits';
import EntitySearch from '../../../components/EntitySearch';
import BookingManagementBase from '../../../components/BookingManagementBase';
import EditClientDialog from './EditClientDialog';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography } from '@mui/material';

interface User {
  name: string;
  client_id: number;
}

export default function UserHistory({
  initialUser,
}: {
  initialUser?: User;
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<User | null>(initialUser || null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { t } = useTranslation();
  const { role } = useAuth();
  const showNotes = role === 'staff' || role === 'agency';

  useEffect(() => {
    if (initialUser) return;
    const name = searchParams.get('name');
    const clientId = searchParams.get('clientId');
    if (name && clientId) {
      setSelected({ name, client_id: Number(clientId) });
    }
  }, [searchParams, initialUser]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {initialUser ? t('booking_history') : t('client_history')}
      </Typography>
      <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="100vh">
        <Box width="100%" maxWidth={800} mt={4}>
          {!initialUser && (
            <EntitySearch
              type="user"
              placeholder={t('search_by_name_or_client_id')}
              onSelect={u => setSelected(u as User)}
              onNotFound={id => setPendingId(id)}
            />
          )}
          {selected && (
            <BookingManagementBase
              user={selected}
              getBookingHistory={getBookingHistory}
              cancelBooking={cancelBooking}
              rescheduleBookingByToken={rescheduleBookingByToken}
              getSlots={getSlots}
              onDeleteVisit={deleteClientVisit}
              showNotes={showNotes}
              renderEditDialog={({ open, onClose, onUpdated }) => (
                <EditClientDialog
                  open={open}
                  clientId={selected.client_id}
                  onClose={onClose}
                  onUpdated={onUpdated}
                  onClientUpdated={name => setSelected({ ...selected, name })}
                />
              )}
              renderDeleteVisitButton={(b, isSmall, open) =>
                role === 'staff' && b.status === 'visited' && !b.slot_id ? (
                  <Button
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
          )}
        </Box>
      </Box>
      {pendingId && (
        <ConfirmDialog
          message={`Add client ${pendingId}?`}
          onConfirm={() => {
            navigate(`/staff/client-management?tab=add&clientId=${pendingId}`);
            setPendingId(null);
          }}
          onCancel={() => setPendingId(null)}
        />
      )}
    </Box>
  );
}

