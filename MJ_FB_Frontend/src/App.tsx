import { useState, useEffect } from 'react';
import Profile from './components/Profile';
import StaffDashboard from './components/StaffDashboard/StaffDashboard';
import ManageAvailability from './components/StaffDashboard/ManageAvailability';
import UserHistory from './components/StaffDashboard/UserHistory';
import SlotBooking from './components/SlotBooking';
import AddUser from './components/StaffDashboard/AddUser';
import PantrySchedule from './components/StaffDashboard/PantrySchedule';
import Login from './components/Login';
import StaffLogin from './components/StaffLogin';
import VolunteerLogin from './components/VolunteerLogin';
import VolunteerDashboard from './components/VolunteerDashboard';
import CoordinatorDashboard from './components/CoordinatorDashboard';
import type { Role } from './types';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [role, setRole] = useState<Role>((localStorage.getItem('role') || '') as Role);
  const [activePage, setActivePage] = useState(() => {
    return window.location.pathname === '/volunteer-dashboard' ? 'volunteerDashboard' : 'profile';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState<'user' | 'staff' | 'volunteer'>('user');
  const isStaff = role === 'staff' || role === 'volunteer_coordinator';
  const isCoordinator = role === 'volunteer_coordinator';

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setActivePage(detail);
    }
    window.addEventListener('navigate', handler as EventListener);
    return () => window.removeEventListener('navigate', handler as EventListener);
  }, []);

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
  if (isStaff) {
    navLinks = navLinks.concat([
      { label: 'Staff Dashboard', id: 'staffDashboard' },
      { label: 'Manage Availability', id: 'manageAvailability' },
      { label: 'Pantry Schedule', id: 'pantrySchedule' },
      { label: 'Add User', id: 'addUser' },
      { label: 'User History', id: 'userHistory' },
    ]);
    if (isCoordinator) {
      navLinks.push({ label: 'Coordinator Dashboard', id: 'coordinatorDashboard' });
    }
  } else if (role === 'shopper') {
    navLinks = navLinks.concat([
      { label: 'Booking Slots', id: 'slots' },
      { label: 'Booking History', id: 'bookingHistory' },
    ]);
  } else if (role === 'volunteer') {
    navLinks = navLinks.concat([{ label: 'Volunteer Dashboard', id: 'volunteerDashboard' }]);
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
            onVolunteer={() => setLoginMode('volunteer')}
          />
        ) : loginMode === 'staff' ? (
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
        ) : (
          <VolunteerLogin
            onLogin={(u) => {
              setToken(u.token);
              setRole(u.role);
              localStorage.setItem('token', u.token);
              localStorage.setItem('role', u.role);
              localStorage.setItem('name', u.name);
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
            {activePage === 'staffDashboard' && isStaff && (
              <StaffDashboard token={token} setError={setError} setLoading={setLoading} />
            )}
            {activePage === 'manageAvailability' && isStaff && (
              <ManageAvailability token={token} />
            )}
            {activePage === 'pantrySchedule' && isStaff && (
              <PantrySchedule token={token} />
            )}
            {activePage === 'slots' && role === 'shopper' && (
              <SlotBooking token={token} role="shopper" />
            )}
            {activePage === 'bookingHistory' && role === 'shopper' && (
              <UserHistory
                token={token}
                initialUser={{ id: 0, name: localStorage.getItem('name') || '', client_id: 0 }}
              />
            )}
            {activePage === 'addUser' && isStaff && (
              <AddUser token={token} />
            )}
            {activePage === 'userHistory' && isStaff && (
              <UserHistory token={token} />
            )}
            {activePage === 'coordinatorDashboard' && role === 'volunteer_coordinator' && (
              <CoordinatorDashboard token={token} />
            )}
            {activePage === 'volunteerDashboard' && role === 'volunteer' && (
              <VolunteerDashboard token={token} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
