import { useState } from 'react';
import Profile from './components/Profile';
import StaffDashboard from './components/StaffDashboard/StaffDashboard';
import ManageHolidays from './components/StaffDashboard/ManageHolidays';
import Slots from './components/Slots/Slots';
import UserBookings from './components/StaffDashboard/StaffBookAppointment';
import AddUser from './components/StaffDashboard/AddUser';
import Login from './components/Login';

type Role = 'staff' | 'shopper' | 'delivery';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [role, setRole] = useState<Role>((localStorage.getItem('role') || '') as Role);
  const [name, setName] = useState(localStorage.getItem('name') || '');
  const [activePage, setActivePage] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function logout() {
    setToken('');
    setRole('' as Role);
    setName('');
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
      { label: 'Book Appointment', id: 'bookAppointment' },
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
            setName(u.name);
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
            {activePage === 'profile' && <Profile token={token} setError={setError} setLoading={setLoading} />}
            {activePage === 'staffDashboard' && role === 'staff' && (
              <StaffDashboard token={token} setError={setError} setLoading={setLoading} />
            )}
            {activePage === 'manageHolidays' && role === 'staff' && (
              <ManageHolidays token={token} setError={setError} setLoading={setLoading} />
            )}
            {activePage === 'bookAppointment' && role === 'staff' && (
              <Slots token={token} setError={setError} setLoading={setLoading} />
            )}
            {activePage === 'userBookings' && role === 'staff' && (
              <UserBookings token={token} setError={setError} setLoading={setLoading} />
            )}
            {activePage === 'slots' && role === 'shopper' && (
              <Slots token={token} setError={setError} setLoading={setLoading} />
            )}
            {activePage === 'addUser' && role === 'staff' && (
              <AddUser token={token} setError={setError} setLoading={setLoading} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
