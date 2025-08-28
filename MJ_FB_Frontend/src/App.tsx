import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Dashboard from './components/dashboard/Dashboard';
import Navbar, { type NavGroup, type NavLink } from './components/Navbar';
import FeedbackSnackbar from './components/FeedbackSnackbar';
import MainLayout from './components/layout/MainLayout';
import { useAuth, AgencyGuard } from './hooks/useAuth';
import type { StaffAccess } from './types';

const Profile = React.lazy(() => import('./pages/booking/Profile'));
const ManageAvailability = React.lazy(() =>
  import('./pages/staff/ManageAvailability')
);
const UserHistory = React.lazy(() =>
  import('./pages/staff/client-management/UserHistory')
);
const ClientManagement = React.lazy(() =>
  import('./pages/staff/ClientManagement')
);
const AgencyClientManager = React.lazy(() =>
  import('./pages/staff/AgencyClientManager')
);
const BookingUI = React.lazy(() => import('./pages/BookingUI'));
const PantrySchedule = React.lazy(() =>
  import('./pages/staff/PantrySchedule')
);
const AgencySchedule = React.lazy(() =>
  import('./pages/agency/AgencySchedule')
);
const ClientList = React.lazy(() => import('./pages/agency/ClientList'));
const ClientHistory = React.lazy(() =>
  import('./pages/agency/ClientHistory')
);
const Login = React.lazy(() => import('./pages/auth/Login'));
const StaffLogin = React.lazy(() => import('./pages/auth/StaffLogin'));
const VolunteerLogin = React.lazy(() => import('./pages/auth/VolunteerLogin'));
const ClientSignup = React.lazy(() => import('./pages/auth/ClientSignup'));
const VolunteerDashboard = React.lazy(() =>
  import('./pages/volunteer-management/VolunteerDashboard')
);
const VolunteerManagement = React.lazy(() =>
  import('./pages/volunteer-management/VolunteerManagement')
);
const ClientDashboard = React.lazy(() =>
  import('./pages/client/ClientDashboard')
);
const VolunteerBookingHistory = React.lazy(() =>
  import('./pages/volunteer-management/VolunteerBookingHistory')
);
const VolunteerBooking = React.lazy(() =>
  import('./pages/volunteer-management/VolunteerBooking')
);
const WarehouseDashboard = React.lazy(() =>
  import('./pages/warehouse-management/WarehouseDashboard')
);
const DonationLog = React.lazy(() =>
  import('./pages/warehouse-management/DonationLog')
);
const TrackPigpound = React.lazy(() =>
  import('./pages/warehouse-management/TrackPigpound')
);
const TrackOutgoingDonations = React.lazy(() =>
  import('./pages/warehouse-management/TrackOutgoingDonations')
);
const TrackSurplus = React.lazy(() =>
  import('./pages/warehouse-management/TrackSurplus')
);
const Aggregations = React.lazy(() =>
  import('./pages/warehouse-management/Aggregations')
);
const DonorProfile = React.lazy(() =>
  import('./pages/warehouse-management/DonorProfile')
);
const Exports = React.lazy(() => import('./pages/warehouse-management/Exports'));
const AdminStaffForm = React.lazy(() => import('./pages/admin/AdminStaffForm'));
const AdminStaffList = React.lazy(() => import('./pages/admin/AdminStaffList'));
const AppConfigurations = React.lazy(() =>
  import('./pages/admin/AppConfigurations')
);
const PantrySettings = React.lazy(() => import('./pages/admin/PantrySettings'));
const VolunteerSettings = React.lazy(() =>
  import('./pages/admin/VolunteerSettings')
);
const Events = React.lazy(() => import('./pages/events/Events'));
const PantryVisits = React.lazy(() => import('./pages/staff/PantryVisits'));
const AgencyLogin = React.lazy(() => import('./pages/agency/Login'));
const AgencyClientBookings = React.lazy(() =>
  import('./pages/agency/ClientBookings')
);

const Spinner = () => <CircularProgress />;

export default function App() {
  const { role, name, userRole, access, login, logout } = useAuth();
  const [loading] = useState(false);
  const [error, setError] = useState('');
  const isStaff = role === 'staff';
  const hasAccess = (a: StaffAccess) => access.includes('admin') || access.includes(a);
  const showStaff = isStaff && hasAccess('pantry');
  const showVolunteerManagement = isStaff && hasAccess('volunteer_management');
  const showWarehouse = isStaff && hasAccess('warehouse');
  const showAdmin = isStaff && access.includes('admin');

  const singleAccessOnly =
    isStaff && access.length === 1 && access[0] !== 'admin';
  const staffRootPath = singleAccessOnly
    ? access[0] === 'pantry'
      ? '/pantry'
      : access[0] === 'volunteer_management'
        ? '/volunteer-management'
        : access[0] === 'warehouse'
          ? '/warehouse-management'
          : '/'
    : '/';

  const navGroups: NavGroup[] = [];
  const profileLinks: NavLink[] | undefined = isStaff
    ? [{ label: 'Events', to: '/events' }]
    : undefined;
  if (!role) {
    navGroups.push(
      { label: 'Client Login', links: [{ label: 'Client Login', to: '/login/user' }] },
      {
        label: 'Internal Login',
        links: [
          { label: 'Staff Login', to: '/login/staff' },
          { label: 'Volunteer Login', to: '/login/volunteer' },
          { label: 'Agency Login', to: '/login/agency' },
        ],
      },
      { label: 'Client Sign Up', links: [{ label: 'Sign Up', to: '/signup' }] },
    );
  } else if (isStaff) {
    const staffLinks = [
      { label: 'Dashboard', to: '/pantry' },
      { label: 'Manage Availability', to: '/pantry/manage-availability' },
      { label: 'Pantry Schedule', to: '/pantry/schedule' },
      { label: 'Pantry Visits', to: '/pantry/visits' },
      { label: 'Client Management', to: '/pantry/client-management' },
      { label: 'Agency Management', to: '/pantry/agency-management' },
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
      { label: 'Exports', to: '/warehouse-management/exports' },
    ];
    if (showWarehouse) navGroups.push({ label: 'Warehouse Management', links: warehouseLinks });
    if (showAdmin)
      navGroups.push({
        label: 'Admin',
        links: [
          { label: 'Staff', to: '/admin/staff' },
          { label: 'App Config', to: '/admin/app-config' },
          { label: 'Pantry Settings', to: '/admin/pantry-settings' },
          { label: 'Volunteer Settings', to: '/admin/volunteer-settings' },
        ],
      });

  } else if (role === 'agency') {
    navGroups.push({
      label: 'Agency',
      links: [
        { label: 'Schedule', to: '/agency/schedule' },
        { label: 'Clients', to: '/agency/clients' },
        { label: 'Client History', to: '/agency/history' },
      ],
    });
  } else if (role === 'shopper') {
    navGroups.push({
      label: 'Booking',
      links: [
        { label: 'Book Appointment', to: '/book-appointment' },
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
          { label: 'Book Appointment', to: '/book-appointment' },
          { label: 'Booking History', to: '/booking-history' },
        ],
      });
    }
  }

  const navbarProps = {
    groups: navGroups,
    onLogout: role ? logout : undefined,
    name: role ? name || undefined : undefined,
    loading,
    role,
    profileLinks,
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        <FeedbackSnackbar
          open={!!error}
          onClose={() => setError('')}
          message={error}
          severity="error"
        />

        {role ? (
          <MainLayout {...navbarProps}>
            <Suspense fallback={<Spinner />}>
              <Routes>
              <Route
                path="/"
                element={
                  role === 'volunteer' ? (
                      <VolunteerDashboard />
                  ) : role === 'agency' ? (
                    <AgencyGuard>
                      <AgencySchedule />
                    </AgencyGuard>
                  ) : isStaff ? (
                    singleAccessOnly && staffRootPath !== '/' ? (
                      <Navigate to={staffRootPath} replace />
                    ) : (
                        <Dashboard role="staff" masterRoleFilter={['Pantry']} />
                    )
                  ) : (
                    <ClientDashboard />
                  )
                }
              />
                <Route path="/profile" element={<Profile role={role} />} />
              {showStaff && (
                <Route path="/pantry" element={<Dashboard role="staff" masterRoleFilter={['Pantry']} />} />
              )}
              {showStaff && (
                <Route path="/pantry/manage-availability" element={<ManageAvailability />} />
              )}
              {showStaff && (
                <Route path="/pantry/schedule" element={<PantrySchedule />} />
              )}
              {showStaff && (
                <Route path="/pantry/visits" element={<PantryVisits />} />
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
              {showWarehouse && (
                <Route
                  path="/warehouse-management/exports"
                  element={<Exports />}
                />
              )}
              {role === 'agency' && (
                <Route
                  path="/agency/clients"
                  element={<AgencyClientBookings />}
                />
              )}
              {role === 'shopper' && (
                <Route path="/book-appointment" element={<BookingUI shopperName={name || undefined} />} />
              )}
              {role === 'shopper' && (
                <Route
                  path="/booking-history"
                  element={
                    <UserHistory
                      initialUser={{ id: 0, name, client_id: 0 }}
                    />
                  }
                />
              )}
              {role === 'volunteer' && userRole === 'shopper' && (
                <Route path="/book-appointment" element={<BookingUI shopperName={name || undefined} />} />
              )}
              {role === 'volunteer' && userRole === 'shopper' && (
                <Route
                  path="/booking-history"
                  element={
                    <UserHistory
                      initialUser={{ id: 0, name, client_id: 0 }}
                    />
                  }
                />
              )}
              {showStaff && (
                <Route
                  path="/pantry/client-management"
                  element={<ClientManagement />}
                />
              )}
              {showStaff && (
                <Route
                  path="/pantry/agency-management"
                  element={<AgencyClientManager />}
                />
              )}
              {isStaff && <Route path="/events" element={<Events />} />}
              {showAdmin && <Route path="/admin/staff" element={<AdminStaffList />} />}
              {showAdmin && <Route path="/admin/staff/create" element={<AdminStaffForm />} />}
              {showAdmin && <Route path="/admin/staff/:id" element={<AdminStaffForm />} />}
              {showAdmin && <Route path="/admin/app-config" element={<AppConfigurations />} />}
              {showAdmin && <Route path="/admin/pantry-settings" element={<PantrySettings />} />}
              {showAdmin && <Route path="/admin/volunteer-settings" element={<VolunteerSettings />} />}
              {showVolunteerManagement && (
                <>
                  <Route
                    path="/volunteer-management"
                    element={<VolunteerManagement />}
                  />
                  <Route
                    path="/volunteer-management/:tab"
                    element={<VolunteerManagement />}
                  />
                </>
              )}
              {role === 'volunteer' && (
                <>
                  <Route
                    path="/volunteer/schedule"
                    element={<VolunteerBooking />}
                  />
                  <Route
                    path="/volunteer/history"
                    element={<VolunteerBookingHistory />}
                  />
                </>
              )}
              {role === 'agency' && (
                <>
                  <Route
                    path="/agency/schedule"
                    element={
                      <AgencyGuard>
                        <AgencySchedule />
                      </AgencyGuard>
                    }
                  />
                  <Route
                    path="/agency/clients"
                    element={
                      <AgencyGuard>
                        <ClientList />
                      </AgencyGuard>
                    }
                  />
                  <Route
                    path="/agency/history"
                    element={
                      <AgencyGuard>
                        <ClientHistory />
                      </AgencyGuard>
                    }
                  />
                </>
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </MainLayout>
        ) : (
          <>
            <Navbar {...navbarProps} />
            <main>
              <Suspense fallback={<Spinner />}>
                <Routes>
                  <Route path="/signup" element={<ClientSignup />} />
                  <Route path="/login/user" element={<Login onLogin={login} />} />
                  <Route path="/login/staff" element={<StaffLogin onLogin={login} />} />
                  <Route path="/login/volunteer" element={<VolunteerLogin onLogin={login} />} />
                  <Route path="/login/agency" element={<AgencyLogin onLogin={login} />} />
                  <Route path="/login" element={<Navigate to="/login/user" replace />} />
                  <Route path="*" element={<Navigate to="/login/user" replace />} />
                </Routes>
              </Suspense>
            </main>
          </>
        )}
      </div>
    </BrowserRouter>
  );
}
