import { useState } from 'react';
import Profile from './components/Profile';
import StaffDashboard from './components/StaffDashboard/StaffDashboard';
import ManageHolidays from './components/StaffDashboard/ManageHolidays';
import SlotBooking from './components/SlotBooking';
import AddUser from './components/StaffDashboard/AddUser';
import ViewSchedule from './components/StaffDashboard/ViewSchedule';
import Login from './components/Login';
import type { Role } from './types';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [role, setRole] = useState<Role>((localStorage.getItem('role') || '') as Role);
  const [activePage, setActivePage] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function logout() {
    setToken('');
    setRole('' as Role);
    localStorage.clear();
  }

  function handleNavClick(id: string) {
    setError('');
    setActivePage(id);
  }

  let navLinks: { label: string; id: string }[] = [{ label: 'Profile', id: 'profile' }];
  if (role === 'staff') {
    navLinks = navLinks.concat([
      { label: 'Staff Dashboard', id: 'staffDashboard' },
      { label: 'Manage Holidays', id: 'manageHolidays' },
      { label: 'View Schedule', id: 'viewSchedule' },
      { label: 'User Bookings', id: 'userBookings' },
      { label: 'Add User', id: 'addUser' },
    ]);
  } else if (role === 'shopper') {
    navLinks = navLinks.concat([{ label: 'Booking Slots', id: 'slots' }]);
  }

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: 'auto',
        padding: 16,
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {!token ? (
        <Login
          onLogin={(u) => {
            setToken(u.token);
            setRole(u.role);
            localStorage.setItem('token', u.token);
            localStorage.setItem('role', u.role);
            localStorage.setItem('name', u.name);
          }}
        />
      ) : (
        <>
          <nav
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 24,
              borderBottom: '1px solid #ccc',
              paddingBottom: 8,
              flexWrap: 'wrap',
            }}
            aria-label="Main navigation"
          >
            {navLinks.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
                disabled={loading}
                aria-current={activePage === id ? 'page' : undefined}
                style={{
                  backgroundColor: activePage === id ? '#007bff' : 'transparent',
                  color: activePage === id ? 'white' : 'black',
                  border: 'none',
                  padding: '8px 12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  borderRadius: 4,
                }}
              >
                {label}
              </button>
            ))}

            <button
              onClick={logout}
              disabled={loading}
              style={{
                marginLeft: 'auto',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                borderRadius: 4,
              }}
            >
              Logout
            </button>
          </nav>

          {error && (
            <div
              role="alert"
              style={{
                color: 'red',
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <main>
            {activePage === 'profile' && <Profile />}
            {activePage === 'staffDashboard' && role === 'staff' && (
              <StaffDashboard token={token} setError={setError} setLoading={setLoading} />
            )}
            {activePage === 'manageHolidays' && role === 'staff' && (
              <ManageHolidays token={token} />
            )}
            {activePage === 'viewSchedule' && role === 'staff' && (
              <ViewSchedule token={token} />
            )}
            {activePage === 'userBookings' && role === 'staff' && (
              <SlotBooking token={token} role="staff" />
            )}
            {activePage === 'slots' && role === 'shopper' && (
              <SlotBooking token={token} role="shopper" />
            )}
            {activePage === 'addUser' && role === 'staff' && (
              <AddUser token={token} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
