import { Tabs, Tab } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import Page from '../../components/Page';

export default function VolunteerTabs() {
  const location = useLocation();
  const base = '/volunteer-management/volunteers';
  const path = location.pathname.replace(base, '');
  const value = path.startsWith('/create')
    ? 1
    : path.startsWith('/pending-reviews')
    ? 2
    : 0;

  return (
    <Page
      title="Volunteers"
      header={
        <Tabs value={value} sx={{ mb: 2 }}>
          <Tab label="Search" component={RouterLink} to={`${base}/search`} />
          <Tab label="Add Volunteer" component={RouterLink} to={`${base}/create`} />
          <Tab label="Pending Reviews" component={RouterLink} to={`${base}/pending-reviews`} />
        </Tabs>
      }
    >
      <Outlet />
    </Page>
  );
}
