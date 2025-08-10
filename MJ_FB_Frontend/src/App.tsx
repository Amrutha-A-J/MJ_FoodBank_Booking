import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Profile from './components/Profile';
import ManageAvailability from './components/StaffDashboard/ManageAvailability';
import UserHistory from './components/StaffDashboard/UserHistory';
import SlotBooking from './components/SlotBooking';
import AddUser from './components/StaffDashboard/AddUser';
import PantrySchedule from './components/StaffDashboard/PantrySchedule';
import Login from './components/Login';
import StaffLogin from './components/StaffLogin';
import VolunteerLogin from './components/VolunteerLogin';
import VolunteerDashboard from './components/VolunteerDashboard';
import VolunteerManagement from './components/VolunteerManagement';
import Dashboard from './pages/Dashboard';
import VolunteerBookingHistory from './components/VolunteerBookingHistory';
import type { Role } from './types';
import Navbar, { type NavGroup } from './components/Navbar';
import FeedbackSnackbar from './components/FeedbackSnackbar';
import Breadcrumbs from './components/Breadcrumbs';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [role, setRole] = useState<Role>(() => (localStorage.getItem('role') as Role) || ('' as Role));
  const [name, setName] = useState(() => localStorage.getItem('name') || '');
  const [loading] = useState(false);
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
        { label: 'Manage Availability', to: '/manage-availability' },
        { label: 'Pantry Schedule', to: '/pantry-schedule' },
        { label: 'Add User', to: '/add-user' },
        { label: 'User History', to: '/user-history' },
      ];
    navGroups.push({ label: 'Staff', links: staffLinks });
      navGroups.push({
        label: 'Volunteer Management',
        links: [
          { label: 'Dashboard', to: '/volunteer-management' },
          { label: 'Schedule', to: '/volunteer-management/schedule' },
          { label: 'Search', to: '/volunteer-management/search' },
          { label: 'Create', to: '/volunteer-management/create' },
          { label: 'Pending', to: '/volunteer-management/pending' },
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
    navGroups.push({
      label: 'Volunteer',
      links: [
        { label: 'Schedule', to: '/' },
        { label: 'Booking History', to: '/volunteer/history' },
      ],
    });
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
                      role === 'volunteer' ? (
                        <VolunteerDashboard token={token} />
                      ) : (
                        <Dashboard role={isStaff ? 'staff' : 'user'} token={token} />
                      )
                    }
                  />
                  <Route path="/profile" element={<Profile token={token} role={role} />} />
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
                  <>
                    <Route
                      path="/volunteer-management"
                      element={<VolunteerManagement token={token} />}
                    />
                    <Route
                      path="/volunteer-management/:tab"
                      element={<VolunteerManagement token={token} />}
                    />
                  </>
                )}
                {role === 'volunteer' && (
                  <Route
                    path="/volunteer/history"
                    element={<VolunteerBookingHistory token={token} />}
                  />
                )}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
          </>
        )}
      </div>
    </BrowserRouter>
  );
}
