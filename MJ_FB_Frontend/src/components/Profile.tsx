import { useEffect, useState } from 'react';
import type { Role, UserProfile } from '../types';
import { getUserProfile } from '../api/api';

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
      <div>
        <h2>User Profile</h2>
        <p>Profile view is only available for shoppers.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>User Profile</h2>
      {error && <p>{error}</p>}
      {!profile && !error && <p>Loading...</p>}
      {profile && (
        <ul>
          <li>
            Name: {profile.firstName} {profile.lastName}
          </li>
          <li>Client ID: {profile.clientId}</li>
          <li>Email: {profile.email || 'N/A'}</li>
          <li>Phone: {profile.phone || 'N/A'}</li>
          <li>Visits this month: {profile.bookingsThisMonth}</li>
        </ul>
      )}
    </div>
  );
}
