import type { Role } from '../types';

export default function Profile() {
  const role = (localStorage.getItem('role') || '') as Role;
  const name = localStorage.getItem('name') || '';

  if (['staff', 'volunteer_coordinator'].includes(role)) {
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
      <p>Welcome, {name}!</p>
    </div>
  );
}
