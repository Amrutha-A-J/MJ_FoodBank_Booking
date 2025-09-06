import { useState, useEffect } from 'react';
import StyledTabs from '../../components/StyledTabs';
import Page from '../../components/Page';
import { useSearchParams } from 'react-router-dom';
import AddClient from './client-management/AddClient';
import UpdateClientData from './client-management/UpdateClientData';
import UserHistory from './client-management/UserHistory';
import NewClients from './client-management/NewClients';
import NoShowWeek from './client-management/NoShowWeek';

export default function ClientManagement() {
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('tab');
  const [tab, setTab] = useState(() => {
    switch (initial) {
      case 'add':
        return 1;
      case 'update':
        return 2;
      case 'new':
        return 3;
      case 'noshow':
        return 4;
      default:
        return 0; // 'history' or unknown -> Search Client
    }
  });

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'add') setTab(1);
    else if (t === 'update') setTab(2);
    else if (t === 'new') setTab(3);
    else if (t === 'noshow') setTab(4);
    else setTab(0); // 'history' or undefined -> Search Client
  }, [searchParams]);
  const tabs = [
    { label: 'Search Client', content: <UserHistory /> },
    { label: 'Add', content: <AddClient /> },
    { label: 'Update', content: <UpdateClientData /> },
    { label: 'New Clients', content: <NewClients /> },
    { label: 'No Shows', content: <NoShowWeek /> },
  ];

  return (
    <Page title="Client Management">
      <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
    </Page>
  );
}

