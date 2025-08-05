import type { Role } from '../types';

export default function Profile() {
  const role = (localStorage.getItem('role') || '') as Role;
  if (['staff', 'volunteer_coordinator', 'admin'].includes(role)) {
    return (
      <div>
        <h2>User Profile</h2>
        <p>Profile view is only available for shoppers.</p>
      </div>
    );
  }
  const name = localStorage.getItem('name');
  return (
    <div>
      <h2>User Profile</h2>
      {name && <p>Welcome, {name}!</p>}
    </div>
  );
}
