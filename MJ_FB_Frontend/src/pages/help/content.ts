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
    {
      title: 'Recurring shifts',
      body: 'Search volunteers and schedule or cancel repeating shifts from the Recurring Shifts page.',
    },
  ],
  warehouse: [
    {
      title: 'Log donations and outgoing shipments',
      body: 'Record food donations and outgoing shipments from the warehouse dashboard.',
    },
    {
      title: 'Track surplus and pig-pound weights',
      body: 'Use the Track Surplus and Track Pig Pound pages to record weight totals.',
    },
    {
      title: 'Export or review aggregate reports',
      body: 'Use the Aggregations page to review monthly totals or export yearly spreadsheets.',
    },
  ],
  admin: [
    {
      title: 'Manage staff',
      body: 'Admins can add staff members and configure system settings.',
    },
  ],
};

