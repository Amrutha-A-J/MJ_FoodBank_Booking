import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
const Dashboard = React.lazy(
  () => import('./components/dashboard/Dashboard')
);
import Navbar from './components/Navbar';
import FeedbackSnackbar from './components/FeedbackSnackbar';
import MainLayout from './components/layout/MainLayout';
import { useAuth, DonorManagementGuard } from './hooks/useAuth';
import useMaintenance from './hooks/useMaintenance';
import type { StaffAccess } from './types';
import { getStaffRootPath } from './utils/staffRootPath';
import { buildNavData } from './utils/navConfig';
import InstallAppButton from './components/InstallAppButton';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import MaintenanceBanner from './components/MaintenanceBanner';

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
const BookingUI = React.lazy(() => import('./pages/BookingUI'));
const PantrySchedule = React.lazy(() =>
  import('./pages/staff/PantrySchedule')
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
const VolunteerProfile = React.lazy(() =>
  import('./pages/staff/volunteer-management/VolunteerProfile')
);
const VolunteerDailyBookings = React.lazy(() =>
  import('./pages/staff/VolunteerDailyBookings')
);
const WarehouseDashboard = React.lazy(() =>
  import('./pages/warehouse-management/WarehouseDashboard')
);
const WarehouseDonationLog = React.lazy(() =>
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
const FoodBankTrends = React.lazy(() =>
  import('./pages/aggregations/FoodBankTrends')
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
const Maintenance = React.lazy(() => import('./pages/admin/Maintenance'));
const Events = React.lazy(() => import('./pages/events/Events'));
const PantryVisits = React.lazy(() => import('./pages/staff/PantryVisits'));
const PantryAggregations = React.lazy(() =>
  import('./pages/staff/PantryAggregations')
);
const Timesheets = React.lazy(() => import('./pages/staff/timesheets'));
const LeaveManagement = React.lazy(
  () => import('./pages/staff/LeaveManagement'),
);
const AdminLeaveRequests = React.lazy(
  () => import('./pages/admin/LeaveRequests'),
);
const CancelBooking = React.lazy(() => import('./pages/CancelBooking'));
const RescheduleBooking = React.lazy(() => import('./pages/RescheduleBooking'));
const DonorDashboard = React.lazy(() =>
  import('./pages/donor-management/DonorDashboard')
);
const DonorProfilePage = React.lazy(() =>
  import('./pages/donor-management/DonorProfile')
);
const Donors = React.lazy(() =>
  import('./pages/donor-management/DonorsPage')
);
const MailLists = React.lazy(() =>
  import('./pages/donor-management/MailLists')
);
const DonorDonationLog = React.lazy(() =>
  import('./pages/donor-management/DonationLog')
);
const PrivacyPolicy = React.lazy(() =>
  import('./pages/privacy/PrivacyPolicy')
);
const BookDelivery = React.lazy(() => import('./pages/delivery/BookDelivery'));
const DeliveryHistory = React.lazy(
  () => import('./pages/delivery/DeliveryHistory')
);
const DeliveryDashboard = React.lazy(
  () => import('./pages/delivery/DeliveryDashboard')
);
const PantryDeliveries = React.lazy(
  () => import('./pages/pantry/Deliveries')
);
const RecordDelivery = React.lazy(
  () => import('./pages/pantry/RecordDelivery')
);

const Spinner = () => <CircularProgress />;

export default function App() {
  const { isAuthenticated, ready, role, name, userRole, access, login, logout } = useAuth();
  const [loading] = useState(false);
  const [error, setError] = useState('');
  const { maintenanceMode, notice } = useMaintenance();
  const isStaff = role === 'staff' || access.includes('admin');
  const hasAccess = (a: StaffAccess) => access.includes('admin') || access.includes(a);
  const showStaff = isStaff && hasAccess('pantry');
  const showVolunteerManagement = isStaff && hasAccess('volunteer_management');
  const showWarehouse = isStaff && hasAccess('warehouse');
  const showDonorManagement = hasAccess('donor_management');
  const showAdmin = isStaff && access.includes('admin');
  const showDonationEntry = role === 'volunteer' && access.includes('donation_entry');
  const showDonationLog = showWarehouse || showDonationEntry;
  const showAggregations = isStaff;

  const staffRootPath = getStaffRootPath(access as StaffAccess[]);
  const singleAccessOnly = isStaff && staffRootPath !== '/';

  const { navGroups, profileLinks } = buildNavData({
    role,
    isStaff,
    showStaff,
    showVolunteerManagement,
    showWarehouse,
    showDonorManagement,
    showAdmin,
    showDonationEntry,
    showAggregations,
    userRole,
  });

  const navbarProps = {
    groups: navGroups,
    onLogout: isAuthenticated ? logout : undefined,
    name: isAuthenticated ? name || undefined : undefined,
    loading,
    role,
    profileLinks,
  };
  const AppContent = ({ maintenanceNotice }: { maintenanceNotice?: string }) => {
    const location = useLocation();
    const path = location.pathname;
    const showOverlay =
      maintenanceMode && !(isStaff || path === '/login');
    return (
      <>
        {showOverlay && <MaintenanceOverlay />}
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
          ) : isAuthenticated ? (
            <MaintenanceBanner notice={maintenanceNotice}>
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
                      ) : isStaff ? (
                        singleAccessOnly && staffRootPath !== '/' ? (
                          <Navigate to={staffRootPath} replace />
                        ) : (
                          <Suspense fallback={<Spinner />}>
                            <Dashboard role="staff" masterRoleFilter={['Pantry']} />
                          </Suspense>
                        )
                      ) : role === 'delivery' ? (
                        <DeliveryDashboard />
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
                    <Route path="/pantry/deliveries" element={<PantryDeliveries />} />
                  )}
                  {showStaff && (
                    <Route path="/pantry/deliveries/record" element={<RecordDelivery />} />
                  )}
                  {showStaff && (
                    <Route path="/pantry/visits" element={<PantryVisits />} />
                  )}
                  {showAggregations && (
                    <Route
                      path="/aggregations/trends"
                      element={<FoodBankTrends />}
                    />
                  )}
                  {showAggregations && (
                    <Route path="/aggregations/pantry" element={<PantryAggregations />} />
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
                    <Route
                      path="/warehouse-management/donation-log"
                      element={<WarehouseDonationLog />}
                    />
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
                  {showAggregations && (
                    <Route
                      path="/aggregations/warehouse"
                      element={<Aggregations />}
                    />
                  )}
                  {showAggregations && (
                    <Route
                      path="/warehouse-management/aggregations"
                      element={<Navigate to="/aggregations/warehouse" replace />}
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
                          initialUser={{ name, client_id: 0, role: 'shopper' }}
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
                          initialUser={{ name, client_id: 0, role: 'shopper' }}
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
                  {showAdmin && (
                    <Route path="/admin/maintenance" element={<Maintenance />} />
                  )}
                  {showDonorManagement && (
                    <>
                      <Route
                        path="/donor-management"
                        element={
                          <DonorManagementGuard>
                            <DonorDashboard />
                          </DonorManagementGuard>
                        }
                      />
                      <Route
                        path="/donor-management/donors"
                        element={
                          <DonorManagementGuard>
                            <Donors />
                          </DonorManagementGuard>
                        }
                      />
                      <Route
                        path="/donor-management/donation-log"
                        element={
                          <DonorManagementGuard>
                            <DonorDonationLog />
                          </DonorManagementGuard>
                        }
                      />
                      <Route
                        path="/donor-management/mail-lists"
                        element={
                          <DonorManagementGuard>
                            <MailLists />
                          </DonorManagementGuard>
                        }
                      />
                      <Route
                        path="/donor-management/donors/:id"
                        element={
                          <DonorManagementGuard>
                            <DonorProfilePage />
                          </DonorManagementGuard>
                        }
                      />
                    </>
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
                        path="/volunteer-management/volunteers/:volunteerId"
                        element={<VolunteerProfile />}
                      />
                      <Route
                        path="/volunteer-management/daily"
                        element={<VolunteerDailyBookings />}
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

                  {role === 'delivery' && (
                    <>
                      <Route
                        path="/delivery/book"
                        element={<BookDelivery />}
                      />
                      <Route
                        path="/delivery/history"
                        element={<DeliveryHistory />}
                      />
                    </>
                  )}

                  <Route path="/set-password" element={<PasswordSetup />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </MainLayout>
            </MaintenanceBanner>
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
                    <Route path="/privacy" element={<PrivacyPolicy />} />
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
      <AppContent maintenanceNotice={notice} />
    </BrowserRouter>
  );
}
