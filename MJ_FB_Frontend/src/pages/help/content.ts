export interface HelpSection {
  title: string;
  body: string;
}

export const helpContent: Record<
  'client' | 'volunteer' | 'agency' | 'pantry' | 'warehouse' | 'admin',
  HelpSection[]
> = {
  client: [
    {
      title: 'Booking appointments',
      body: 'Reserve pantry visits from your dashboard.',
    },
    {
      title: 'Rescheduling or canceling',
      body: 'Change or cancel a booking from the booking history list.',
    },
    {
      title: 'View booking history',
      body: 'Past and upcoming bookings are listed under the booking history page.',
    },
    {
      title: 'Manage profile and password',
      body: 'Update contact information or change your password from the profile page.',
    },
    {
      title: 'Visit counts and reminders',
      body: 'The dashboard shows your monthly visit totals and upcoming booking reminders.',
    },
  ],
  volunteer: [
    {
      title: 'View schedule',
      body: 'The volunteer schedule shows available shifts for trained roles.',
    },
    {
      title: 'Recurring bookings',
      body: 'Set up weekly shifts from the recurring bookings page.',
    },
  ],
  agency: [
    {
      title: 'Search and link clients',
      body: 'Find clients by name and link them to your agency.',
    },
    {
      title: 'Book for clients',
      body: 'Create appointments for linked clients from the agency schedule.',
    },
    {
      title: 'Cancel or reschedule bookings',
      body: 'Modify client appointments directly from the schedule.',
    },
    {
      title: 'View schedule and booking history',
      body: 'Check upcoming appointments and past visits for linked clients.',
    },
    {
      title: 'Edit profile and contact info',
      body: 'Update your agency name, email, and phone from the profile page.',
    },
  ],
  pantry: [
    {
      title: 'Manage availability',
      body: 'Staff can open or block pantry slots and adjust capacities.',
    },
    {
      title: 'Manage volunteers',
      body: 'Search, add, and review volunteers from the Volunteers page.',
    },
    {
      title: 'Recurring shifts',
      body: 'Search volunteers and schedule or cancel repeating shifts from the Recurring Shifts page.',
    },
  ],
  warehouse: [
    {
      title: 'Track donations',
      body: 'Warehouse staff record incoming and outgoing donations from the dashboard.',
    },
  ],
  admin: [
    {
      title: 'Staff users and permissions',
      body: 'Admins can add new staff accounts, edit existing users, and manage permissions.',
    },
    {
      title: 'Pantry, warehouse, and volunteer settings',
      body: 'Configure system options for pantry scheduling, warehouse tracking, and volunteer management.',
    },
    {
      title: 'Volunteer master roles and shifts',
      body: 'Create or update master roles and define the shifts available for each role.',
    },
    {
      title: 'Restore default roles and shifts',
      body: 'Reset volunteer roles and shift setups to their default configuration when needed.',
    },
  ],
};

