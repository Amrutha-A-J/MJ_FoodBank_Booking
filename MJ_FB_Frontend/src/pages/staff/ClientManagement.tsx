import { Grid, Tabs, Tab } from '@mui/material';
import { Link, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AddClient from './client-management/AddClient';
import UpdateClientData from './client-management/UpdateClientData';
import UserHistory from './client-management/UserHistory';

export default function ClientManagement({ token }: { token: string }) {
  const location = useLocation();
  const last = location.pathname.split('/').pop();
  const value = last === 'update' || last === 'history' ? last : 'add';

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Tabs value={value} aria-label="client management tabs">
          <Tab label="Add" value="add" component={Link} to="add" />
          <Tab label="Update" value="update" component={Link} to="update" />
          <Tab label="History" value="history" component={Link} to="history" />
        </Tabs>
      </Grid>
      <Grid item xs={12}>
        <Routes>
          <Route index element={<Navigate to="add" replace />} />
          <Route path="add" element={<AddClient token={token} />} />
          <Route path="update" element={<UpdateClientData token={token} />} />
          <Route path="history" element={<UserHistory token={token} />} />
        </Routes>
      </Grid>
    </Grid>
  );
}
