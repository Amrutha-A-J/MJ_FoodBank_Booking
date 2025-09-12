import React, { useState, Suspense } from 'react';
import { Tabs, Tab, CircularProgress } from '@mui/material';
import Page from '../../components/Page';

const VolunteerManagement = React.lazy(() => import('./VolunteerManagement'));
const DeleteVolunteer = React.lazy(() => import('./DeleteVolunteer'));

export default function VolunteerTabs() {
  const [tab, setTab] = useState(0);

  return (
    <Page title="Volunteers">
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Search" />
        <Tab label="Add Volunteer" />
        <Tab label="Delete Volunteer" />
      </Tabs>
      <Suspense fallback={<CircularProgress />}>
        {tab === 0 && <VolunteerManagement initialTab="search" />}
        {tab === 1 && <VolunteerManagement initialTab="create" />}
        {tab === 2 && <DeleteVolunteer />}
      </Suspense>
    </Page>
  );
}
