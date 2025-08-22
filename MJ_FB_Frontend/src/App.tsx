import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Profile from './components/Profile';
import ManageAvailability from './components/StaffDashboard/ManageAvailability';
import UserHistory from './components/StaffDashboard/UserHistory';
import SlotBooking from './components/SlotBooking';
import AddUser from './components/StaffDashboard/AddUser';
import PantrySchedule from './components/StaffDashboard/PantrySchedule';
import Pending from './components/StaffDashboard/Pending';
import Login from './components/Login';
import StaffLogin from './components/StaffLogin';
import VolunteerLogin from './components/VolunteerLogin';
import VolunteerDashboard from './components/VolunteerDashboard';
import VolunteerManagement from './components/VolunteerManagement';
import Dashboard from './pages/Dashboard';
import UserDashboard from './pages/UserDashboard';
import VolunteerBookingHistory from './components/VolunteerBookingHistory';
import VolunteerSchedule from './components/VolunteerSchedule';
import WarehouseDashboard from './pages/WarehouseDashboard';
import DonationLog from './pages/DonationLog';
import TrackPigpound from './pages/TrackPigpound';
import TrackOutgoingDonations from './pages/TrackOutgoingDonations';
import TrackSurplus from './pages/TrackSurplus';
import Aggregations from './pages/Aggregations';
import Navbar, { type NavGroup } from './components/Navbar';
import FeedbackSnackbar from './components/FeedbackSnackbar';
import Breadcrumbs from './components/Breadcrumbs';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { token, role, name, userRole, login, logout } = useAuth();
  const [loading] = useState(false);
  const [error, setError] = useState('');
  const isStaff = role === 'staff';

  const navGroups: NavGroup[] = [];
  if (!token) {
    navGroups.push(
      { label: 'User Login', links: [{ label: 'User Login', to: '/login/user' }] },
      { label: 'Volunteer Login', links: [{ label: 'Volunteer Login', to: '/login/volunteer' }] },
      { label: 'Staff Login', links: [{ label: 'Staff Login', to: '/login/staff' }] },
    );
  } else if (isStaff) {
    const staffLinks = [
      { label: 'Manage Availability', to: '/manage-availability' },
      { label: 'Pantry Schedule', to: '/pantry-schedule' },
      { label: 'Add User', to: '/add-user' },
      { label: 'User History', to: '/user-history' },
      { label: 'Pending', to: '/pending' },
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
    navGroups.push({
      label: 'Warehouse Management',
      links: [
        { label: 'Dashboard', to: '/warehouse-management' },
        { label: 'Donation Log', to: '/warehouse-management/donation-log' },
        { label: 'Track Pigpound', to: '/warehouse-management/track-pigpound' },
        {
          label: 'Track Outgoing Donations',
          to: '/warehouse-management/track-outgoing-donations',
        },
        { label: 'Track Surplus', to: '/warehouse-management/track-surplus' },
        { label: 'Aggregations', to: '/warehouse-management/aggregations' },
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
        { label: 'Dashboard', to: '/' },
        { label: 'Schedule', to: '/volunteer/schedule' },
        { label: 'Booking History', to: '/volunteer/history' },
      ],
    });
    if (userRole === 'shopper') {
      navGroups.push({
        label: 'Booking',
        links: [
          { label: 'Booking Slots', to: '/slots' },
          { label: 'Booking History', to: '/booking-history' },
        ],
      });
    }
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar
          groups={navGroups}
          onLogout={token ? logout : undefined}
          name={token ? name || undefined : undefined}
          loading={loading}
        />

        <FeedbackSnackbar
          open={!!error}
          onClose={() => setError('')}
          message={error}
          severity="error"
        />

          {token ? (
          <main>
            <Breadcrumbs />
            <Routes>
              <Route
                path="/"
                element={
                  role === 'volunteer' ? (
                    <VolunteerDashboard token={token} />
                  ) : isStaff ? (
                    <Dashboard role="staff" token={token} />
                  ) : (
                    <UserDashboard />
                  )
                }
              />
              <Route path="/profile" element={<Profile token={token} role={role} />} />
              {isStaff && (
                <Route path="/manage-availability" element={<ManageAvailability />} />
              )}
              {isStaff && (
                <Route path="/pantry-schedule" element={<PantrySchedule token={token} />} />
              )}
              {isStaff && (
                <Route path="/warehouse-management" element={<WarehouseDashboard />} />
              )}
              {isStaff && (
                <Route path="/warehouse-management/donation-log" element={<DonationLog />} />
              )}
              {isStaff && (
                <Route
                  path="/warehouse-management/track-pigpound"
                  element={<TrackPigpound />}
                />
              )}
              {isStaff && (
                <Route
                  path="/warehouse-management/track-outgoing-donations"
                  element={<TrackOutgoingDonations />}
                />
              )}
              {isStaff && (
                <Route
                  path="/warehouse-management/track-surplus"
                  element={<TrackSurplus />}
                />
              )}
              {isStaff && (
                <Route
                  path="/warehouse-management/aggregations"
                  element={<Aggregations />}
                />
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
              {role === 'volunteer' && userRole === 'shopper' && (
                <Route path="/slots" element={<SlotBooking token={token} role="shopper" />} />
              )}
              {role === 'volunteer' && userRole === 'shopper' && (
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
              {isStaff && <Route path="/pending" element={<Pending />} />}
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
                <>
                  <Route
                    path="/volunteer/schedule"
                    element={<VolunteerSchedule token={token} />}
                  />
                  <Route
                    path="/volunteer/history"
                    element={<VolunteerBookingHistory token={token} />}
                  />
                </>
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        ) : (
          <main>
            <Routes>
                <Route path="/login/user" element={<Login onLogin={login} />} />
                <Route path="/login/staff" element={<StaffLogin onLogin={login} />} />
                <Route path="/login/volunteer" element={<VolunteerLogin onLogin={login} />} />
              <Route path="/login" element={<Navigate to="/login/user" replace />} />
              <Route path="*" element={<Navigate to="/login/user" replace />} />
            </Routes>
          </main>
        )}
      </div>
    </BrowserRouter>
  );
}
