import type { TFunction } from 'i18next';

export interface HelpSection {
  title: string;
  body: {
    description: string;
    steps?: string[];
  };
}

export function getHelpContent(
  t: TFunction,
): Record<'client' | 'volunteer' | 'agency' | 'pantry' | 'warehouse' | 'admin', HelpSection[]> {
  return {
    client: [
      {
        title: t('help.client.booking_appointments.title'),
        body: {
          description: t('help.client.booking_appointments.description'),
          steps: [
            t('help.client.booking_appointments.steps.0'),
            t('help.client.booking_appointments.steps.1'),
            t('help.client.booking_appointments.steps.2'),
          ],
        },
      },
      {
        title: t('help.client.rescheduling_or_canceling.title'),
        body: {
          description: t('help.client.rescheduling_or_canceling.description'),
          steps: [
            t('help.client.rescheduling_or_canceling.steps.0'),
            t('help.client.rescheduling_or_canceling.steps.1'),
            t('help.client.rescheduling_or_canceling.steps.2'),
          ],
        },
      },
      {
        title: t('help.client.view_booking_history.title'),
        body: {
          description: t('help.client.view_booking_history.description'),
          steps: [
            t('help.client.view_booking_history.steps.0'),
            t('help.client.view_booking_history.steps.1'),
          ],
        },
      },
      {
        title: t('help.client.manage_profile_and_password.title'),
        body: {
          description: t('help.client.manage_profile_and_password.description'),
          steps: [
            t('help.client.manage_profile_and_password.steps.0'),
            t('help.client.manage_profile_and_password.steps.1'),
            t('help.client.manage_profile_and_password.steps.2'),
          ],
        },
      },
      {
        title: t('help.client.visit_counts_and_reminders.title'),
        body: {
          description: t('help.client.visit_counts_and_reminders.description'),
          steps: [
            t('help.client.visit_counts_and_reminders.steps.0'),
            t('help.client.visit_counts_and_reminders.steps.1'),
            t('help.client.visit_counts_and_reminders.steps.2'),
          ],
        },
      },
    ],
    volunteer: [
    {
      title: 'View schedule',
      body: {
        description: 'The volunteer schedule shows available shifts for your trained roles.',
        steps: [
          'Open the Volunteer Schedule.',
          'Select a role from the dropdown.',
          'Review open shifts.',
        ],
      },
    },
    {
      title: 'Book, cancel, or reschedule shifts',
      body: {
        description: 'Manage your volunteer shifts.',
        steps: [
          'Click an available shift to book.',
          'Go to Upcoming Shifts on the dashboard.',
          'Choose Cancel or Reschedule as needed.',
        ],
      },
    },
    {
      title: 'Recurring bookings',
      body: {
        description: 'Reserve the same shift each week.',
        steps: [
          'Open Recurring Bookings.',
          'Select the role and pattern.',
          'Submit to create recurring shifts.',
        ],
      },
    },
    {
      title: 'Stats, badges, and leaderboard',
      body: {
        description: 'Track your progress and ranking.',
        steps: [
          'Visit the Volunteer Dashboard.',
          'Check your hours and badges.',
          'Compare your rank on the leaderboard.',
        ],
      },
    },
    {
      title: 'Update profile',
      body: {
        description: 'Keep your contact details current.',
        steps: [
          'Go to the Profile page.',
          'Edit phone or email.',
          'Save updates.',
        ],
      },
    },
  ],
  agency: [
    {
      title: 'Search and link clients',
      body: {
        description: 'Find clients by name and link them to your agency.',
        steps: [
          'Go to Agency Clients.',
          'Search for the client.',
          'Click Link to add them.',
        ],
      },
    },
    {
      title: 'Book for clients',
      body: {
        description: 'Create appointments for linked clients.',
        steps: [
          'Open the Agency Schedule.',
          'Pick a linked client.',
          'Choose a date and confirm the booking.',
        ],
      },
    },
    {
      title: 'Cancel or reschedule bookings',
      body: {
        description: 'Modify client appointments directly from the schedule.',
        steps: [
          'Open the schedule.',
          'Select the client\'s booking.',
          'Choose Reschedule or Cancel.',
        ],
      },
    },
    {
      title: 'View schedule and booking history',
      body: {
        description: 'Check upcoming appointments and past visits for linked clients.',
        steps: [
          'Navigate to Booking History.',
          'Filter by client.',
          'Browse visits.',
        ],
      },
    },
    {
      title: 'Edit profile and contact info',
      body: {
        description: 'Update your agency name, email, and phone.',
        steps: [
          'Go to the Profile page.',
          'Adjust name, email, or phone.',
          'Save changes.',
        ],
      },
    },
  ],
  pantry: [
    {
      title: 'Manage availability',
      body: {
        description: 'Open or block pantry slots and adjust capacities.',
        steps: [
          'Open the Pantry Schedule.',
          'Use controls to open or block slots.',
          'Save capacity changes.',
        ],
      },
    },
    {
      title: 'Manage volunteers',
      body: {
        description: 'Search, add, and review volunteers.',
        steps: [
          'Go to the Volunteers page.',
          'Search by name.',
          'View or edit volunteer information.',
        ],
      },
    },
    {
      title: 'Recurring shifts',
      body: {
        description: 'Schedule or cancel repeating shifts for volunteers.',
        steps: [
          'Open Recurring Shifts.',
          'Search for the volunteer.',
          'Set the pattern and save.',
        ],
      },
    },
    {
      title: 'Record visits and handle no-shows',
      body: {
        description: 'Mark bookings as visited while logging weights and adding visit notes, or record no-shows.',
        steps: [
          'Open the schedule.',
          'Select a booking.',
          'Mark visited or no-show, enter weight, and add a visit note if needed.',
        ],
      },
    },
    {
      title: 'Filter visits by notes',
      body: {
        description: 'Show only visits that contain notes.',
        steps: [
          'Open Booking History.',
          'Enable the notes-only filter.',
          'Review the matching visits.',
        ],
      },
    },
    {
      title: 'View booking notes',
      body: {
        description: 'Staff dialogs display any note submitted with a booking.',
        steps: [
          'Open the schedule.',
          'Select a booking.',
          'Read the note in the dialog.',
        ],
      },
    },
    {
      title: 'Book new clients from the schedule',
      body: {
        description: 'Use the Assign User modal to book a slot for an unregistered individual.',
        steps: [
          'Click Assign User on a slot.',
          'Choose New client.',
          'Enter name and confirm booking.',
        ],
      },
    },
    {
      title: 'Manage agencies and their clients',
      body: {
        description: 'Link or unlink agency clients and make bookings on their behalf.',
        steps: [
          'Open agency management pages.',
          'Search for the agency or client.',
          'Link, unlink, or use the Book button to schedule for a client.',
        ],
      },
    },
    {
      title: 'Review volunteer performance and pending bookings',
      body: {
        description: 'Staff dashboards show volunteer hours, outstanding requests, and no-show rates for follow-up.',
        steps: [
          'Open the staff dashboard.',
          'Review hours, requests, and no-show rates.',
          'Follow up with volunteers as required.',
        ],
      },
    },
    {
      title: t('help.pantry.timesheets.title'),
      body: {
        description: t('help.pantry.timesheets.description'),
        steps: [
          t('help.pantry.timesheets.steps.0'),
          t('help.pantry.timesheets.steps.1'),
          t('help.pantry.timesheets.steps.2'),
          t('help.pantry.timesheets.steps.3'),
        ],
      },
    },
  ],
  warehouse: [
    {
      title: 'Log donations and outgoing shipments',
      body: {
        description: 'Record food donations and outgoing shipments from the warehouse dashboard.',
        steps: [
          'Open the Warehouse Dashboard.',
          'Select Donor or Outgoing page.',
          'Enter weights and save.',
        ],
      },
    },
    {
      title: 'Track surplus and pig-pound weights',
      body: {
        description: 'Use the Track Surplus and Track Pig Pound pages to record weight totals.',
        steps: [
          'Go to Track Surplus or Track Pig Pound.',
          'Add the weight entry.',
          'Submit the form.',
        ],
      },
    },
    {
      title: 'Export or review aggregate reports',
      body: {
        description:
          'Use the Aggregations page to review monthly totals or export donor and overall yearly spreadsheets.',
        steps: [
          'Open the Aggregations page.',
          'Select the year or month.',
          'Export the spreadsheet or review the table.',
        ],
      },
    },
  ],
  admin: [
    {
      title: 'Staff users and permissions',
      body: {
        description:
          'Admins can add new staff accounts, edit existing users, resend password setup links, and manage permissions.',
        steps: [
          'Go to Admin > Staff.',
          'Use Add Staff or Edit to modify a user.',
          'Assign permissions, save changes, or resend setup links.',
        ],
      },
    },
    {
      title: 'Pantry, warehouse, and volunteer settings',
      body: {
        description: 'Configure system options for pantry scheduling, warehouse tracking, and volunteer management.',
        steps: [
          'Open Settings.',
          'Choose Pantry, Warehouse, or Volunteer.',
          'Update options and save.',
        ],
      },
    },
    {
      title: 'Volunteer master roles and shifts',
      body: {
        description: 'Create or update master roles and define the shifts available for each role.',
        steps: [
          'Go to Volunteer Roles.',
          'Create or edit a role.',
          'Set available shifts.',
        ],
      },
    },
    {
      title: 'Restore default roles and shifts',
      body: {
        description: 'Reset volunteer roles and shift setups to their default configuration when needed.',
        steps: [
          'Open Volunteer Roles.',
          'Choose Restore Defaults.',
          'Confirm the reset.',
        ],
      },
    },
  ],
  };
}

