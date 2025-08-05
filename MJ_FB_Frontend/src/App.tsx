import { useState } from 'react';
import Profile from './components/Profile';
import StaffDashboard from './components/StaffDashboard/StaffDashboard';
import ManageAvailability from './components/StaffDashboard/ManageAvailability';
import UserHistory from './components/StaffDashboard/UserHistory';
import SlotBooking from './components/SlotBooking';
import AddUser from './components/StaffDashboard/AddUser';
import ViewSchedule from './components/StaffDashboard/ViewSchedule';
import Login from './components/Login';
import StaffLogin from './components/StaffLogin';
import type { Role } from './types';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [role, setRole] = useState<Role>((localStorage.getItem('role') || '') as Role);
  const [activePage, setActivePage] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState<'user' | 'staff'>('user');

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
      { label: 'Manage Availability', id: 'manageAvailability' },
      { label: 'View Schedule', id: 'viewSchedule' },
      { label: 'Add User', id: 'addUser' },
      { label: 'User History', id: 'userHistory' },
    ]);
  } else if (role === 'shopper') {
    navLinks = navLinks.concat([{ label: 'Booking Slots', id: 'slots' }]);
  }

  return (
    <div className="app-container">
      {!token ? (
        loginMode === 'user' ? (
              <Login
            onLogin={(u) => {
              setToken(u.token);
              setRole(u.role);
              localStorage.setItem('token', u.token);
              localStorage.setItem('role', u.role);
              localStorage.setItem('name', u.name);
              if (u.bookingsThisMonth !== undefined) {
                localStorage.setItem('bookingsThisMonth', u.bookingsThisMonth.toString());
              }
            }}
            onStaff={() => setLoginMode('staff')}
          />
        ) : (
          <StaffLogin
            onLogin={(u) => {
              setToken(u.token);
              setRole(u.role);
              localStorage.setItem('token', u.token);
              localStorage.setItem('role', u.role);
              localStorage.setItem('name', u.name);
              localStorage.removeItem('bookingsThisMonth');
            }}
            onBack={() => setLoginMode('user')}
          />
        )
      ) : (
        <>
          <nav className="navbar" aria-label="Main navigation">
            {navLinks.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
                disabled={loading}
                aria-current={activePage === id ? 'page' : undefined}
                className={activePage === id ? 'active' : undefined}
              >
                {label}
              </button>
            ))}

            <button onClick={logout} disabled={loading} className="logout">
              Logout
            </button>
          </nav>

          {error && (
            <div role="alert" className="error-message">
              {error}
            </div>
          )}

          <main>
            {activePage === 'profile' && <Profile />}
            {activePage === 'staffDashboard' && role === 'staff' && (
              <StaffDashboard token={token} setError={setError} setLoading={setLoading} />
            )}
            {activePage === 'manageAvailability' && role === 'staff' && (
              <ManageAvailability token={token} />
            )}
            {activePage === 'viewSchedule' && role === 'staff' && (
              <ViewSchedule token={token} />
            )}
            {activePage === 'slots' && role === 'shopper' && (
              <SlotBooking token={token} role="shopper" />
            )}
            {activePage === 'addUser' && role === 'staff' && (
              <AddUser token={token} />
            )}
            {activePage === 'userHistory' && role === 'staff' && (
              <UserHistory token={token} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
