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
      body: 'Clients can book, reschedule, or cancel appointments from their dashboard.',
    },
    {
      title: 'View booking history',
      body: 'Past and upcoming bookings are listed under the booking history page.',
    },
  ],
  volunteer: [
    {
      title: 'View schedule',
      body: 'The volunteer schedule shows available shifts for your trained roles.',
    },
    {
      title: 'Book, cancel, or reschedule shifts',
      body: 'Pick an open shift to book it, then manage upcoming shifts to cancel or choose a new time.',
    },
    {
      title: 'Recurring bookings',
      body: 'Use the Recurring Bookings page to reserve the same shift each week.',
    },
    {
      title: 'Stats, badges, and leaderboard',
      body: 'Your dashboard shows hours served, earned badges, and your spot on the volunteer leaderboard.',
    },
    {
      title: 'Update profile',
      body: 'Edit your contact information on the Profile page so coordinators can reach you.',
    },
  ],
  agency: [
    {
      title: 'Book for clients',
      body: 'Agencies may create, reschedule, or cancel bookings for linked clients.',
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
      title: 'Manage staff',
      body: 'Admins can add staff members and configure system settings.',
    },
  ],
};

