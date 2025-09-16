import { useState, useEffect, useMemo } from 'react';
import StyledTabs from '../../components/StyledTabs';
import Page from '../../components/Page';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import { useSearchParams } from 'react-router-dom';
import AddClient from './client-management/AddClient';
import UpdateClientData from './client-management/UpdateClientData';
import UserHistory from './client-management/UserHistory';
import NewClients from './client-management/NewClients';
import NoShowWeek from './client-management/NoShowWeek';
import DeleteClient from './client-management/DeleteClient';

const tabNames = ['history', 'add', 'update', 'new', 'noshow', 'delete'] as const;

export default function ClientManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const initial = (searchParams.get('tab') ?? tabNames[0]) as (typeof tabNames)[number];
    const idx = tabNames.indexOf(initial);
    return idx === -1 ? 0 : idx;
  });

  useEffect(() => {
    const t = (searchParams.get('tab') ?? tabNames[0]) as (typeof tabNames)[number];
    const idx = tabNames.indexOf(t);
    setTab(idx === -1 ? 0 : idx);
  }, [searchParams]);
  const tabs = useMemo(
    () => [
      { label: 'Search Client', content: <UserHistory /> },
      { label: 'Add', content: <AddClient /> },
      { label: 'Update', content: <UpdateClientData /> },
      { label: 'New Clients', content: <NewClients /> },
      { label: 'No Shows', content: <NoShowWeek /> },
      { label: 'Delete', content: <DeleteClient /> },
    ],
    [],
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
    </Page>
  );
}

