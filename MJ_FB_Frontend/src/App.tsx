import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Breadcrumbs from './components/Breadcrumbs';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [role, setRole] = useState<Role>(() => (localStorage.getItem('role') as Role) || ('' as Role));
  const [name, setName] = useState(() => localStorage.getItem('name') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState<'user' | 'staff' | 'volunteer'>('user');
  const isStaff = role === 'staff';

  function logout() {
    setToken('');
    setRole('' as Role);
    setName('');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
  }

  const navGroups: NavGroup[] = [];
  if (isStaff) {
    const staffLinks = [
      { label: 'Staff Dashboard', to: '/staff-dashboard' },
      { label: 'Manage Availability', to: '/manage-availability' },
      { label: 'Pantry Schedule', to: '/pantry-schedule' },
      { label: 'Add User', to: '/add-user' },
      { label: 'User History', to: '/user-history' },
    ];
    navGroups.push({ label: 'Staff', links: staffLinks });
    navGroups.push({
      label: 'Volunteer Management',
      links: [
        { label: 'Schedule', to: '/coordinator-dashboard?tab=schedule' },
        { label: 'Search', to: '/coordinator-dashboard?tab=search' },
        { label: 'Create', to: '/coordinator-dashboard?tab=create' },
        { label: 'Pending', to: '/coordinator-dashboard?tab=pending' },
      ],
    });
  } else if (role === 'shopper') {
    navGroups.push({
      label: 'Booking',
      links: [
        { label: 'Booking Slots', to: '/slots' },
        { label: 'Booking History', to: '/booking-history' },
      ],
    });
  } else if (role === 'volunteer') {
    navGroups.push({ label: 'Volunteer', links: [{ label: 'Volunteer Dashboard', to: '/volunteer-dashboard' }] });
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        {!token ? (
        loginMode === 'user' ? (
          <Login
            onLogin={(u) => {
              setToken(u.token);
              setRole(u.role);
              setName(u.name);
              localStorage.setItem('token', u.token);
              localStorage.setItem('role', u.role);
              localStorage.setItem('name', u.name);
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
              localStorage.setItem('token', u.token);
              localStorage.setItem('role', u.role);
              localStorage.setItem('name', u.name);
            }}
            onBack={() => setLoginMode('user')}
          />
        ) : (
          <VolunteerLogin
            onLogin={(u) => {
              setToken(u.token);
              setRole(u.role);
              setName(u.name);
              localStorage.setItem('token', u.token);
              localStorage.setItem('role', u.role);
              localStorage.setItem('name', u.name);
            }}
            onBack={() => setLoginMode('user')}
          />
        )
        ) : (
          <>
            <Navbar
              groups={navGroups}
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
              <Breadcrumbs />
              <Routes>
                <Route
                  path="/"
                  element={
                    <Navigate
                      to={
                        role === 'volunteer'
                          ? '/volunteer-dashboard'
                          : role === 'staff'
                          ? '/pantry-schedule'
                          : '/profile'
                      }
                    />
                  }
                />
                <Route path="/profile" element={<Profile token={token} role={role} />} />
                {isStaff && (
                  <Route
                    path="/staff-dashboard"
                    element={
                      <StaffDashboard
                        token={token}
                        setError={setError}
                        setLoading={setLoading}
                      />
                    }
                  />
                )}
                {isStaff && (
                  <Route path="/manage-availability" element={<ManageAvailability token={token} />} />
                )}
                {isStaff && (
                  <Route path="/pantry-schedule" element={<PantrySchedule token={token} />} />
                )}
                {role === 'shopper' && (
                  <Route path="/slots" element={<SlotBooking token={token} role="shopper" />} />
                )}
                {role === 'shopper' && (
                  <Route
                    path="/booking-history"
                    element={
                      <UserHistory
                        token={token}
                        initialUser={{ id: 0, name, client_id: 0 }}
                      />
                    }
                  />
                )}
                {isStaff && <Route path="/add-user" element={<AddUser token={token} />} />}
                {isStaff && <Route path="/user-history" element={<UserHistory token={token} />} />}
                {isStaff && (
                  <Route
                    path="/coordinator-dashboard"
                    element={<CoordinatorDashboard token={token} />}
                  />
                )}
                {role === 'volunteer' && (
                  <Route
                    path="/volunteer-dashboard"
                    element={<VolunteerDashboard token={token} />}
                  />
                )}
                <Route
                  path="*"
                  element={
                    <Navigate
                      to={
                        role === 'volunteer'
                          ? '/volunteer-dashboard'
                          : role === 'staff'
                          ? '/pantry-schedule'
                          : '/profile'
                      }
                    />
                  }
                />
              </Routes>
            </main>
          </>
        )}
      </div>
    </BrowserRouter>
  );
}
