import React, { Suspense } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Page from '../components/Page';
const Dashboard = React.lazy(
  () => import('../components/dashboard/Dashboard')
);
import type { DashboardProps } from '../components/dashboard/Dashboard';

export default function DashboardPage(props: DashboardProps) {
  return (
    <Page title="Dashboard">
      <Suspense fallback={<CircularProgress />}>
        <Dashboard {...props} masterRoleFilter={['Pantry']} />
      </Suspense>
    </Page>
  );
}

export { type DashboardProps };
