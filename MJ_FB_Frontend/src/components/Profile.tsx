import { useEffect, useState } from 'react';
import { Typography, List, ListItem } from '@mui/material';
import type { Role, UserProfile } from '../types';
import { getUserProfile } from '../api/api';
import Page from './Page';

export default function Profile({ token, role }: { token: string; role: Role }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (role === 'shopper') {
      getUserProfile(token)
        .then(setProfile)
        .catch(e => setError(e instanceof Error ? e.message : String(e)));
    }
  }, [role, token]);

  if (role === 'staff') {
    return (
      <Page title="User Profile">
        <Typography>Profile view is only available for shoppers.</Typography>
      </Page>
    );
  }

  return (
    <Page title="User Profile">
      {error && <Typography color="error">{error}</Typography>}
      {!profile && !error && <Typography>Loading...</Typography>}
      {profile && (
        <List>
          <ListItem>Name: {profile.firstName} {profile.lastName}</ListItem>
          <ListItem>Client ID: {profile.clientId}</ListItem>
          <ListItem>Email: {profile.email || 'N/A'}</ListItem>
          <ListItem>Phone: {profile.phone || 'N/A'}</ListItem>
          <ListItem>Visits this month: {profile.bookingsThisMonth}</ListItem>
        </List>
      )}
    </Page>
  );
}
