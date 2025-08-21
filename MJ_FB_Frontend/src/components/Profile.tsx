import { useEffect, useState } from 'react';
import { Typography, List, ListItem } from '@mui/material';
import type { Role, UserProfile } from '../types';
import { getUserProfile } from '../api/users';
import Page from './Page';
import ChangePasswordForm from './ChangePasswordForm';

export default function Profile({ role }: { role: Role }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (role === 'shopper') {
      getUserProfile()
        .then(setProfile)
        .catch(e => setError(e instanceof Error ? e.message : String(e)));
    }
  }, [role]);

  return (
    <Page title="User Profile">
      {error && <Typography color="error">{error}</Typography>}
      {role === 'shopper' && !profile && !error && <Typography>Loading...</Typography>}
      {role === 'shopper' && profile && (
        <List>
          <ListItem>Name: {profile.firstName} {profile.lastName}</ListItem>
          <ListItem>Client ID: {profile.clientId}</ListItem>
          <ListItem>Email: {profile.email || 'N/A'}</ListItem>
          <ListItem>Phone: {profile.phone || 'N/A'}</ListItem>
          <ListItem>Visits this month: {profile.bookingsThisMonth}</ListItem>
        </List>
      )}
      {role !== 'shopper' && <Typography>No profile information available.</Typography>}
      <ChangePasswordForm />
    </Page>
  );
}
