import React, { useState, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
const Dashboard = React.lazy(
  () => import('./components/dashboard/Dashboard')
);
import Navbar, { type NavGroup, type NavLink } from './components/Navbar';
import FeedbackSnackbar from './components/FeedbackSnackbar';
import MainLayout from './components/layout/MainLayout';
import { useAuth, AgencyGuard } from './hooks/useAuth';
import type { StaffAccess } from './types';
import { getVolunteerBookingsForReview } from './api/volunteers';
import { getStaffRootPath } from './utils/staffRootPath';
import dayjs, { formatDate } from './utils/date';
import LanguageSelector from './components/LanguageSelector';
import InstallAppButton from './components/InstallAppButton';

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
const AgencyManagement = React.lazy(() =>
  import('./pages/staff/AgencyManagement')
);
const BookingUI = React.lazy(() => import('./pages/BookingUI'));
const PantrySchedule = React.lazy(() =>
  import('./pages/staff/PantrySchedule')
);
const AgencyDashboard = React.lazy(() =>
  import('./pages/agency/AgencyDashboard')
);
const ClientHistory = React.lazy(() =>
  import('./pages/agency/ClientHistory')
);
const Login = React.lazy(() => import('./pages/auth/Login'));
const PasswordSetup = React.lazy(() => import('./pages/auth/PasswordSetup'));
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
const VolunteerRecurringBookings = React.lazy(() =>
  import('./pages/volunteer-management/VolunteerRecurringBookings')
);
const StaffRecurringBookings = React.lazy(() =>
  import('./pages/volunteer-management/StaffRecurringBookings')
);
const VolunteerRankings = React.lazy(() =>
  import('./pages/volunteer-management/VolunteerRankings')
);
const VolunteerAdmin = React.lazy(() =>
  import('./pages/staff/VolunteerManagement')
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
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));
const Events = React.lazy(() => import('./pages/events/Events'));
const PantryVisits = React.lazy(() => import('./pages/staff/PantryVisits'));
const Timesheets = React.lazy(() => import('./pages/staff/timesheets'));
const LeaveManagement = React.lazy(
  () => import('./pages/staff/LeaveManagement'),
);
const AdminLeaveRequests = React.lazy(
  () => import('./pages/admin/LeaveRequests'),
);
const AgencyBookAppointment = React.lazy(() =>
  import('./pages/agency/AgencyBookAppointment')
);
const CancelBooking = React.lazy(() => import('./pages/CancelBooking'));
const RescheduleBooking = React.lazy(() => import('./pages/RescheduleBooking'));

const Spinner = () => <CircularProgress />;

export default function App() {
  const { token, ready, role, name, userRole, access, login, logout } = useAuth();
  const { t } = useTranslation();
  const [loading] = useState(false);
  const [error, setError] = useState('');
  const [pendingReviews, setPendingReviews] = useState(0);
  const isStaff = role === 'staff';
  const hasAccess = (a: StaffAccess) => access.includes('admin') || access.includes(a);
  const showStaff = isStaff && hasAccess('pantry');
  const showVolunteerManagement = isStaff && hasAccess('volunteer_management');
  const showWarehouse = isStaff && hasAccess('warehouse');
  const showAdmin = isStaff && access.includes('admin');
  const showDonationEntry = role === 'volunteer' && access.includes('donation_entry');
  const showDonationLog = showWarehouse || showDonationEntry;

  const staffRootPath = getStaffRootPath(access as StaffAccess[]);
  const singleAccessOnly = isStaff && staffRootPath !== '/';

  useEffect(() => {
    if (showVolunteerManagement) {
      const start = formatDate(dayjs().startOf('week'));
      const end = formatDate(dayjs().startOf('week').add(6, 'day'));
      getVolunteerBookingsForReview(start, end)
        .then(b => setPendingReviews(b.length))
        .catch(() => setPendingReviews(0));
    }
  }, [showVolunteerManagement]);

  const navGroups: NavGroup[] = [];
  const profileLinks: NavLink[] | undefined = isStaff
    ? [
        { label: t('news_and_events'), to: '/events' },
        { label: t('timesheets.title'), to: '/timesheet' },
        { label: t('leave.title'), to: '/leave-requests' },
      ]
    : undefined;
  if (!role) {
    navGroups.push({ label: t('login'), links: [{ label: t('login'), to: '/login' }] });
  } else if (isStaff) {
    const staffLinks = [
      { label: t('dashboard'), to: '/pantry' },
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
          { label: t('dashboard'), to: '/volunteer-management' },
          { label: 'Schedule', to: '/volunteer-management/schedule' },
          { label: 'Recurring Shifts', to: '/volunteer-management/recurring' },
          {
            label: 'Volunteers',
            to: '/volunteer-management/volunteers',
            badge: pendingReviews,
          },
        ],
      });

    const warehouseLinks = [
      { label: t('dashboard'), to: '/warehouse-management' },
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
          { label: t('timesheets.title'), to: '/admin/timesheet' },
          { label: t('leave.title'), to: '/admin/leave-requests' },
          { label: 'Settings', to: '/admin/settings' },
        ],
      });

  } else if (showDonationEntry) {
    navGroups.push({
      label: 'Warehouse Management',
      links: [{ label: 'Donation Log', to: '/warehouse-management/donation-log' }],
    });

  } else if (role === 'agency') {
    navGroups.push({
      label: 'Agency',
      links: [
        { label: t('dashboard'), to: '/' },
        { label: t('book_appointment'), to: '/agency/book' },
        { label: t('booking_history'), to: '/agency/history' },
      ],
    });
  } else if (role === 'shopper') {
    navGroups.push({
      label: t('booking'),
      links: [
        { label: t('dashboard'), to: '/' },
        { label: t('book_appointment'), to: '/book-appointment' },
        { label: t('booking_history'), to: '/booking-history' },
      ],
    });
  } else if (role === 'volunteer') {
    navGroups.push({
      label: 'Volunteer',
      links: [
        { label: t('dashboard'), to: '/' },
        { label: 'Schedule', to: '/volunteer/schedule' },
        { label: 'Recurring Bookings', to: '/volunteer/recurring' },
        { label: t('booking_history'), to: '/volunteer/history' },
      ],
    });
    if (userRole === 'shopper') {
      navGroups.push({
        label: t('booking'),
        links: [
          { label: t('book_appointment'), to: '/book-appointment' },
          { label: t('booking_history'), to: '/booking-history' },
        ],
      });
    }
  }

  const navbarProps = {
    groups: navGroups,
    onLogout: token ? logout : undefined,
    name: token ? name || undefined : undefined,
    loading,
    role,
    profileLinks,
  };
  const AppContent = () => {
    const location = useLocation();
    const path = location.pathname;
    useEffect(() => {
      console.log('Navigated to', path);
    }, [path]);
    const showLanguageSelector =
      path.startsWith('/login') ||
      path.startsWith('/forgot-password') ||
      path.startsWith('/set-password') ||
      path.startsWith('/cancel') ||
      path.startsWith('/reschedule') ||
      path.startsWith('/book-appointment') ||
      path.startsWith('/booking-history') ||
      path.startsWith('/profile') ||
      (path === '/' && role === 'shopper');

    return (
      <>
        {showLanguageSelector && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem' }}>
            <LanguageSelector />
          </div>
        )}
        <div className="app-container">
          <FeedbackSnackbar
            open={!!error}
            onClose={() => setError('')}
            message={error}
            severity="error"
          />

          {path.startsWith('/cancel') || path.startsWith('/reschedule') ? (
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/cancel/:token" element={<CancelBooking />} />
                <Route path="/reschedule/:token" element={<RescheduleBooking />} />
              </Routes>
            </Suspense>
          ) : token ? (
            <MainLayout {...navbarProps}>
              <Suspense fallback={<Spinner />}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      role === 'volunteer' ? (
                        showDonationEntry ? (
                          <Navigate to="/warehouse-management/donation-log" replace />
                        ) : (
                          <VolunteerDashboard />
                        )
                      ) : role === 'agency' ? (
                        <AgencyGuard>
                          <AgencyDashboard />
                        </AgencyGuard>
                      ) : isStaff ? (
                        singleAccessOnly && staffRootPath !== '/' ? (
                          <Navigate to={staffRootPath} replace />
                        ) : (
                          <Suspense fallback={<Spinner />}>
                            <Dashboard role="staff" masterRoleFilter={['Pantry']} />
                          </Suspense>
                        )
                      ) : (
                        <ClientDashboard />
                      )
                    }
                  />
                  <Route path="/profile" element={<Profile role={role} />} />
                  {showStaff && (
                    <Route
                      path="/pantry"
                      element={
                        <Suspense fallback={<Spinner />}>
                          <Dashboard role="staff" masterRoleFilter={['Pantry']} />
                        </Suspense>
                      }
                    />
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
                  {isStaff && (
                    <Route path="/timesheet" element={<Timesheets />} />
                  )}
                  {isStaff && (
                    <Route
                      path="/leave-requests"
                      element={<LeaveManagement />}
                    />
                  )}
                  {showWarehouse && (
                    <Route path="/warehouse-management" element={<WarehouseDashboard />} />
                  )}
                  {showDonationLog && (
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

                  {role === 'shopper' && (
                    <Route path="/book-appointment" element={<BookingUI shopperName={name || undefined} />} />
                  )}
                  {role === 'shopper' && (
                    <Route
                      path="/booking-history"
                      element={
                        <UserHistory
                          initialUser={{ name, client_id: 0 }}
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
                          initialUser={{ name, client_id: 0 }}
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
                      element={<AgencyManagement />}
                    />
                  )}
                  {isStaff && <Route path="/events" element={<Events />} />}
                  {showAdmin && <Route path="/admin/staff" element={<AdminStaffList />} />}
                  {showAdmin && <Route path="/admin/staff/create" element={<AdminStaffForm />} />}
                  {showAdmin && <Route path="/admin/staff/:id" element={<AdminStaffForm />} />}
                  {showAdmin && (
                    <Route path="/admin/timesheet" element={<Timesheets />} />
                  )}
                  {showAdmin && (
                    <Route
                      path="/admin/leave-requests"
                      element={<AdminLeaveRequests />}
                    />
                  )}
                  {showAdmin && (
                    <Route path="/admin/settings" element={<AdminSettings />} />
                  )}
                  {showVolunteerManagement && (
                    <>
                      <Route
                        path="/volunteer-management"
                        element={<VolunteerManagement />}
                      />
                      <Route
                        path="/volunteer-management/volunteers"
                        element={<VolunteerAdmin />}
                      />
                      <Route
                        path="/volunteer-management/rankings"
                        element={<VolunteerRankings />}
                      />
                      <Route
                        path="/volunteer-management/recurring"
                        element={<StaffRecurringBookings />}
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
                        path="/volunteer/recurring"
                        element={<VolunteerRecurringBookings />}
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
                        path="/agency/book"
                        element={
                          <AgencyGuard>
                            <AgencyBookAppointment />
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
                  <Route path="/set-password" element={<PasswordSetup />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </MainLayout>
          ) : !ready ? (
            <Spinner />
          ) : (
            <>
              <Navbar {...navbarProps} />
              <main>
                <Suspense fallback={<Spinner />}>
                  <Routes>
                    <Route path="/login" element={<Login onLogin={login} />} />
                    <Route path="/set-password" element={<PasswordSetup />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </Suspense>
              </main>
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <BrowserRouter>
      <InstallAppButton />
      <AppContent />
    </BrowserRouter>
  );
}
