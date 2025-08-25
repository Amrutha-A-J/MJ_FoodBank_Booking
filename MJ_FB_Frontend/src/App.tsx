import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Profile from './pages/booking/Profile';
import ManageAvailability from './pages/staff/ManageAvailability';
import UserHistory from './pages/staff/UserHistory';
import SlotBooking from './pages/booking/SlotBooking';
import AddUser from './pages/staff/AddUser';
import PantrySchedule from './pages/staff/PantrySchedule';
import Pending from './pages/staff/Pending';
import Login from './pages/auth/Login';
import StaffLogin from './pages/auth/StaffLogin';
import VolunteerLogin from './pages/auth/VolunteerLogin';
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';
import VolunteerManagement from './pages/volunteer-management/VolunteerManagement';
import Dashboard from './components/dashboard/Dashboard';
import UserDashboard from './pages/user/UserDashboard';
import VolunteerBookingHistory from './pages/volunteer/VolunteerBookingHistory';
import VolunteerSchedule from './pages/volunteer/VolunteerSchedule';
import WarehouseDashboard from './pages/warehouse-management/WarehouseDashboard';
import DonationLog from './pages/warehouse-management/DonationLog';
import TrackPigpound from './pages/warehouse-management/TrackPigpound';
import TrackOutgoingDonations from './pages/warehouse-management/TrackOutgoingDonations';
import TrackSurplus from './pages/warehouse-management/TrackSurplus';
import Aggregations from './pages/warehouse-management/Aggregations';
import DonorProfile from './pages/warehouse-management/DonorProfile';
import AdminStaffList from './pages/admin/AdminStaffList';
import AdminStaffForm from './pages/admin/AdminStaffForm';
import Events from './pages/Events';
import PantryVisits from './pages/staff/PantryVisits';
import Navbar, { type NavGroup, type NavLink } from './components/Navbar';
import FeedbackSnackbar from './components/FeedbackSnackbar';
import Breadcrumbs from './components/Breadcrumbs';
import { useAuth } from './hooks/useAuth';
import type { StaffAccess } from './types';

export default function App() {
  const { token, role, name, userRole, access, login, logout } = useAuth();
  const [loading] = useState(false);
  const [error, setError] = useState('');
  const isStaff = role === 'staff';
  const hasAccess = (a: StaffAccess) => access.includes('admin') || access.includes(a);
  const showStaff = isStaff && hasAccess('pantry');
  const showVolunteerManagement = isStaff && hasAccess('volunteer_management');
  const showWarehouse = isStaff && hasAccess('warehouse');
  const showAdmin = isStaff && access.includes('admin');

  const navGroups: NavGroup[] = [];
  const profileLinks: NavLink[] | undefined = isStaff
    ? [{ label: 'Events', to: '/events' }]
    : undefined;
  if (!token) {
    navGroups.push(
      { label: 'Client Login', links: [{ label: 'Client Login', to: '/login/user' }] },
      { label: 'Volunteer Login', links: [{ label: 'Volunteer Login', to: '/login/volunteer' }] },
      { label: 'Staff Login', links: [{ label: 'Staff Login', to: '/login/staff' }] },
    );
  } else if (isStaff) {
    const staffLinks = [
      { label: 'Manage Availability', to: '/manage-availability' },
      { label: 'Pantry Schedule', to: '/pantry-schedule' },
      { label: 'Pantry Visits', to: '/pantry-visits' },
      { label: 'Add Client', to: '/add-user' },
      { label: 'Client History', to: '/user-history' },
      { label: 'Pending', to: '/pending' },
      { label: 'Events', to: '/events' },
    ];
    if (showStaff) navGroups.push({ label: 'Harvest Pantry', links: staffLinks });
    if (showVolunteerManagement)
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

    const warehouseLinks = [
      { label: 'Dashboard', to: '/warehouse-management' },
      { label: 'Donation Log', to: '/warehouse-management/donation-log' },
      { label: 'Track Pigpound', to: '/warehouse-management/track-pigpound' },
      {
        label: 'Track Outgoing Donations',
        to: '/warehouse-management/track-outgoing-donations',
      },
      { label: 'Track Surplus', to: '/warehouse-management/track-surplus' },
      { label: 'Aggregations', to: '/warehouse-management/aggregations' },
    ];
    if (showWarehouse) navGroups.push({ label: 'Warehouse Management', links: warehouseLinks });
    if (showAdmin)
      navGroups.push({
        label: 'Admin',
        links: [
          { label: 'Staff', to: '/admin/staff' },
          { label: 'Add Staff', to: '/admin/staff/create' },
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
          role={role}
          profileLinks={profileLinks}
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
              {showStaff && (
                <Route path="/manage-availability" element={<ManageAvailability />} />
              )}
              {showStaff && (
                <Route path="/pantry-schedule" element={<PantrySchedule token={token} />} />
              )}
              {showStaff && (
                <Route path="/pantry-visits" element={<PantryVisits token={token} />} />
              )}
              {showWarehouse && (
                <Route path="/warehouse-management" element={<WarehouseDashboard />} />
              )}
              {showWarehouse && (
                <Route path="/warehouse-management/donation-log" element={<DonationLog />} />
              )}
              {showWarehouse && (
                <Route path="/warehouse-management/donors/:id" element={<DonorProfile />} />
              )}
              {showWarehouse && (
                <Route
                  path="/warehouse-management/track-pigpound"
                  element={<TrackPigpound />}
                />
              )}
              {showWarehouse && (
                <Route
                  path="/warehouse-management/track-outgoing-donations"
                  element={<TrackOutgoingDonations />}
                />
              )}
              {showWarehouse && (
                <Route
                  path="/warehouse-management/track-surplus"
                  element={<TrackSurplus />}
                />
              )}
              {showWarehouse && (
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
              {showStaff && <Route path="/add-user" element={<AddUser token={token} />} />}
              {showStaff && <Route path="/user-history" element={<UserHistory token={token} />} />}
              {showStaff && <Route path="/pending" element={<Pending />} />}
              {showStaff && <Route path="/events" element={<Events />} />}
              {showAdmin && <Route path="/admin/staff" element={<AdminStaffList />} />}
              {showAdmin && <Route path="/admin/staff/create" element={<AdminStaffForm />} />}
              {showAdmin && <Route path="/admin/staff/:id" element={<AdminStaffForm />} />}
              {showVolunteerManagement && (
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
