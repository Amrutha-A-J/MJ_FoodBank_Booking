import { useState, useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StyledTabs from '../../components/StyledTabs';
import Page from '../../components/Page';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import EntitySearch from '../../components/EntitySearch';
import ConfirmDialog from '../../components/ConfirmDialog';
import AddClient from './client-management/AddClient';
import UpdateClientData from './client-management/UpdateClientData';
import NewClients from './client-management/NewClients';
import NoShowWeek from './client-management/NoShowWeek';
import DeleteClient from './client-management/DeleteClient';

const tabNames = ['history', 'add', 'update', 'new', 'noshow', 'delete'] as const;

export default function ClientManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const initial = (searchParams.get('tab') ?? tabNames[0]) as (typeof tabNames)[number];
    const idx = tabNames.indexOf(initial);
    return idx === -1 ? 0 : idx;
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const selectedClientId = searchParams.get('clientId');

  useEffect(() => {
    const t = (searchParams.get('tab') ?? tabNames[0]) as (typeof tabNames)[number];
    const idx = tabNames.indexOf(t);
    setTab(idx === -1 ? 0 : idx);
  }, [searchParams]);

  useEffect(() => {
    if (selectedClientId) {
      navigate(`/pantry/client-management/clients/${selectedClientId}`);
    }
  }, [navigate, selectedClientId]);

  const tabs = useMemo(
    () => [
      {
        label: 'Search Client',
        content: (
          <Box sx={{ maxWidth: 600, mx: 'auto', width: '100%', mt: 2 }}>
            <Typography variant="h5" gutterBottom>
              Search for a client
            </Typography>
            <EntitySearch
              type="user"
              placeholder="Search by name or client ID"
              onSelect={value => {
                const user = value as { client_id?: number };
                if (user?.client_id) {
                  navigate(`/pantry/client-management/clients/${user.client_id}`);
                }
              }}
              onNotFound={id => {
                (document.activeElement as HTMLElement | null)?.blur();
                setPendingId(id);
              }}
            />
          </Box>
        ),
      },
      { label: 'Add', content: <AddClient /> },
      { label: 'Update', content: <UpdateClientData /> },
      { label: 'New Clients', content: <NewClients /> },
      { label: 'No Shows', content: <NoShowWeek /> },
      { label: 'Delete', content: <DeleteClient /> },
    ],
    [navigate],
  );

  return (
    <Page title="Client Management" header={<PantryQuickLinks />}>
      <StyledTabs
        tabs={tabs}
        value={tab}
        onChange={(_, v) => {
          setTab(v);
          setSearchParams({ tab: tabNames[v] });
        }}
      />
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
    </Page>
  );
}

