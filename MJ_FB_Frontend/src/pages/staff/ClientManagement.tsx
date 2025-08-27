import { useState, useEffect } from 'react';
import { Grid, Tabs, Tab } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import AddClient from './client-management/AddClient';
import UpdateClientData from './client-management/UpdateClientData';
import UserHistory from './client-management/UserHistory';

export default function ClientManagement({ token }: { token: string }) {
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('tab');
  const [value, setValue] = useState<'add' | 'update' | 'history'>(
    initial === 'update' || initial === 'history' ? (initial as 'update' | 'history') : 'add'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'add' || tab === 'update' || tab === 'history') {
      setValue(tab);
    }
  }, [searchParams]);

  const renderContent = () => {
    switch (value) {
      case 'update':
        return <UpdateClientData token={token} />;
      case 'history':
        return <UserHistory token={token} />;
      default:
        return <AddClient token={token} />;
    }
  };

  return (
    <Grid container spacing={2} direction="column">
      <Grid item xs={12}>
        <Tabs
          value={value}
          onChange={(_, newValue: 'add' | 'update' | 'history') => setValue(newValue)}
          aria-label="client management tabs"
        >
          <Tab label="Add" value="add" />
          <Tab label="Update" value="update" />
          <Tab label="History" value="history" />
        </Tabs>
      </Grid>
      <Grid item xs={12}>{renderContent()}</Grid>
    </Grid>
  );
}

