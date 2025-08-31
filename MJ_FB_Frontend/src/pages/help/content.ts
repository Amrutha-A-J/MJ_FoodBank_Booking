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
      body: 'The volunteer schedule shows available shifts for trained roles.',
    },
    {
      title: 'Recurring bookings',
      body: 'Set up weekly shifts from the recurring bookings page.',
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

