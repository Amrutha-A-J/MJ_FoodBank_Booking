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
import Navbar, { type NavGroup } from './components/Navbar';
import FeedbackSnackbar from './components/FeedbackSnackbar';

export default function App() {
  const [token, setToken] = useState('');
  const [role, setRole] = useState<Role>('' as Role);
  const [name, setName] = useState('');
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
    setName('');
  }

  function handleNavClick(id: string) {
    setError('');
    setActivePage(id);
  }

  const navGroups: NavGroup[] = [{ label: 'Profile', links: [{ label: 'Profile', id: 'profile' }] }];
  if (isStaff) {
    const staffLinks = [
      { label: 'Staff Dashboard', id: 'staffDashboard' },
      { label: 'Manage Availability', id: 'manageAvailability' },
      { label: 'Pantry Schedule', id: 'pantrySchedule' },
      { label: 'Add User', id: 'addUser' },
      { label: 'User History', id: 'userHistory' },
    ];
    if (isCoordinator) {
      staffLinks.push({ label: 'Coordinator Dashboard', id: 'coordinatorDashboard' });
    }
    navGroups.push({ label: 'Staff', links: staffLinks });
  } else if (role === 'shopper') {
    navGroups.push({
      label: 'Booking',
      links: [
        { label: 'Booking Slots', id: 'slots' },
        { label: 'Booking History', id: 'bookingHistory' },
      ],
    });
  } else if (role === 'volunteer') {
    navGroups.push({ label: 'Volunteer', links: [{ label: 'Volunteer Dashboard', id: 'volunteerDashboard' }] });
  }

  return (
    <div className="app-container">
      {!token ? (
        loginMode === 'user' ? (
          <Login
            onLogin={(u) => {
              setToken(u.token);
              setRole(u.role);
              setName(u.name);
            }}
            onStaff={() => setLoginMode('staff')}
            onVolunteer={() => setLoginMode('volunteer')}
          />
        ) : loginMode === 'staff' ? (
          <StaffLogin
            onLogin={(u) => {
              setToken(u.token);
              setRole(u.role);
              setName(u.name);
            }}
            onBack={() => setLoginMode('user')}
          />
        ) : (
          <VolunteerLogin
            onLogin={(u) => {
              setToken(u.token);
              setRole(u.role);
              setName(u.name);
            }}
            onBack={() => setLoginMode('user')}
          />
        )
      ) : (
        <>
          <Navbar
            groups={navGroups}
            active={activePage}
            onSelect={handleNavClick}
            onLogout={logout}
            name={name || undefined}
            loading={loading}
          />

          <FeedbackSnackbar
            open={!!error}
            onClose={() => setError('')}
            message={error}
            severity="error"
          />

          <main>
            {activePage === 'profile' && <Profile token={token} role={role} />}
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
                initialUser={{ id: 0, name, client_id: 0 }}
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
