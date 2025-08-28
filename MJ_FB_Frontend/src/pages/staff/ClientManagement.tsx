import { useState, useEffect } from 'react';
import StyledTabs from '../../components/StyledTabs';
import Page from '../../components/Page';
import { useSearchParams } from 'react-router-dom';
import AddClient from './client-management/AddClient';
import UpdateClientData from './client-management/UpdateClientData';
import UserHistory from './client-management/UserHistory';

export default function ClientManagement() {
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('tab');
  const [tab, setTab] = useState(() => {
    switch (initial) {
      case 'update':
        return 1;
      case 'history':
        return 2;
      default:
        return 0;
    }
  });

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'update') setTab(1);
    else if (t === 'history') setTab(2);
    else setTab(0);
  }, [searchParams]);
  const tabs = [
    { label: 'Add', content: <AddClient /> },
    { label: 'Update', content: <UpdateClientData /> },
    { label: 'History', content: <UserHistory /> },
  ];

  return (
    <Page title="Client Management">
      <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
    </Page>
  );
}

