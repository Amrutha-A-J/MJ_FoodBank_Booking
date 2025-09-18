import type { NavGroup, NavLink } from '../components/Navbar';

interface BuildNavOptions {
  role?: string | null;
  isStaff: boolean;
  showStaff: boolean;
  showVolunteerManagement: boolean;
  showWarehouse: boolean;
  showDonorManagement: boolean;
  showAdmin: boolean;
  showDonationEntry: boolean;
  showAggregations: boolean;
  userRole?: string | null;
}

const STAFF_PROFILE_LINKS: NavLink[] = [
  { label: 'News & Events', to: '/events' },
  { label: 'Timesheets', to: '/timesheet' },
  { label: 'Leave Requests', to: '/leave-requests' },
];

export function buildNavData({
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
}: BuildNavOptions): { navGroups: NavGroup[]; profileLinks?: NavLink[] } {
  const navGroups: NavGroup[] = [];
  const profileLinks = isStaff ? STAFF_PROFILE_LINKS : undefined;

  if (!role) {
    navGroups.push({ label: 'Login', links: [{ label: 'Login', to: '/login' }] });
    return { navGroups, profileLinks };
  }

  if (isStaff) {
    const staffLinks: NavLink[] = [
      { label: 'Dashboard', to: '/pantry' },
      { label: 'Manage Availability', to: '/pantry/manage-availability' },
      { label: 'Pantry Schedule', to: '/pantry/schedule' },
      { label: 'Pantry Visits', to: '/pantry/visits' },
      { label: 'Client Management', to: '/pantry/client-management' },
      { label: 'Deliveries', to: '/pantry/deliveries' },
    ];
    if (showStaff) {
      navGroups.push({ label: 'Harvest Pantry', links: staffLinks });
    }

    if (showVolunteerManagement) {
      navGroups.push({
        label: 'Volunteer Management',
        links: [
          { label: 'Dashboard', to: '/volunteer-management' },
          { label: 'Schedule', to: '/volunteer-management/schedule' },
          { label: 'Daily Bookings', to: '/volunteer-management/daily' },
          { label: 'Recurring Shifts', to: '/volunteer-management/recurring' },
          { label: 'Volunteers', to: '/volunteer-management/volunteers' },
        ],
      });
    }

    if (showDonorManagement) {
      navGroups.push({
        label: 'Donor Management',
        links: [
          { label: 'Dashboard', to: '/donor-management' },
          { label: 'Donors', to: '/donor-management/donors' },
          { label: 'Donation Log', to: '/donor-management/donation-log' },
          { label: 'Mail Lists', to: '/donor-management/mail-lists' },
        ],
      });
    }

    const warehouseLinks: NavLink[] = [
      { label: 'Dashboard', to: '/warehouse-management' },
      { label: 'Donation Log', to: '/warehouse-management/donation-log' },
      { label: 'Track Pigpound', to: '/warehouse-management/track-pigpound' },
      {
        label: 'Track Outgoing Donations',
        to: '/warehouse-management/track-outgoing-donations',
      },
      { label: 'Track Surplus', to: '/warehouse-management/track-surplus' },
      { label: 'Exports', to: '/warehouse-management/exports' },
    ];
    if (showWarehouse) {
      navGroups.push({ label: 'Warehouse Management', links: warehouseLinks });
    }

    if (showAggregations) {
      navGroups.push({
        label: 'Aggregations',
        links: [
          { label: 'Food Bank Trends', to: '/aggregations/trends' },
          { label: 'Pantry Aggregations', to: '/aggregations/pantry' },
          { label: 'Warehouse Aggregations', to: '/aggregations/warehouse' },
        ],
      });
    }

    if (showAdmin) {
      navGroups.push({
        label: 'Admin',
        links: [
          { label: 'Staff', to: '/admin/staff' },
          { label: 'Timesheets', to: '/admin/timesheet' },
          { label: 'Leave Requests', to: '/admin/leave-requests' },
          { label: 'Settings', to: '/admin/settings' },
          { label: 'Maintenance', to: '/admin/maintenance' },
        ],
      });
    }

    return { navGroups, profileLinks };
  }

  if (showDonationEntry) {
    navGroups.push({
      label: 'Warehouse Management',
      links: [{ label: 'Donation Log', to: '/warehouse-management/donation-log' }],
    });
    return { navGroups, profileLinks };
  }

  if (role === 'delivery') {
    navGroups.push({
      label: 'Delivery',
      links: [
        { label: 'Dashboard', to: '/' },
        { label: 'Book Delivery', to: '/delivery/book' },
        { label: 'Delivery History', to: '/delivery/history' },
      ],
    });
    return { navGroups, profileLinks };
  }

  if (role === 'shopper') {
    navGroups.push({
      label: 'Booking',
      links: [
        { label: 'Dashboard', to: '/' },
        { label: 'Book Shopping Appointment', to: '/book-appointment' },
        { label: 'Booking History', to: '/booking-history' },
      ],
    });
    return { navGroups, profileLinks };
  }

  if (role === 'volunteer') {
    navGroups.push({
      label: 'Volunteer',
      links: [
        { label: 'Dashboard', to: '/' },
        { label: 'Schedule', to: '/volunteer/schedule' },
        { label: 'Recurring Bookings', to: '/volunteer/recurring' },
        { label: 'Booking History', to: '/volunteer/history' },
      ],
    });

    if (userRole === 'shopper') {
      navGroups.push({
        label: 'Booking',
        links: [
          { label: 'Book Shopping Appointment', to: '/book-appointment' },
          { label: 'Booking History', to: '/booking-history' },
        ],
      });
    }

    return { navGroups, profileLinks };
  }

  return { navGroups, profileLinks };
}
