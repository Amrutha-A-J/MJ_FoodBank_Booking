import { render, screen, fireEvent, within } from '@testing-library/react';
import PantrySchedule from '../PantrySchedule';
import * as bookingApi from '../../../api/bookings';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../api/bookings', () => ({
  getSlots: jest.fn(),
  getBookings: jest.fn(),
  getHolidays: jest.fn(),
  createBookingForUser: jest.fn(),
  createBookingForNewClient: jest.fn(),
}));

describe('PantrySchedule new client workflow', () => {
  beforeEach(() => {
    (bookingApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 1, maxCapacity: 1 },
    ]);
    (bookingApi.getHolidays as jest.Mock).mockResolvedValue([]);
  });

  it('shows new client label', async () => {
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        date: '2024-01-01',
        slot_id: 1,
        user_name: 'New Person',
        user_id: null,
        client_id: null,
        newClientId: 2,
        visits_this_month: 0,
        approved_bookings_this_month: 0,
        is_staff_booking: false,
        reschedule_token: '',
        profile_link: '',
      },
    ]);
    render(
      <MemoryRouter>
        <PantrySchedule />
      </MemoryRouter>,
    );
    expect(await screen.findByText('[NEW CLIENT] New Person')).toBeInTheDocument();
  });

  it('creates booking for new client', async () => {
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <PantrySchedule searchUsersFn={jest.fn()} />
      </MemoryRouter>,
    );

    const rows = await screen.findAllByRole('row');
    const cells = within(rows[1]).getAllByRole('cell');
    fireEvent.click(cells[1]);

    fireEvent.click(screen.getByLabelText('New client'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));

    expect(bookingApi.createBookingForNewClient).toHaveBeenCalledWith(
      'Test User',
      1,
      expect.any(String),
      undefined,
      undefined,
    );
  });
});

describe('PantrySchedule status display', () => {
  beforeEach(() => {
    (bookingApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 2, maxCapacity: 2 },
    ]);
    (bookingApi.getHolidays as jest.Mock).mockResolvedValue([]);
  });

  it('shows bookings with non-cancelled statuses', async () => {
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'completed',
        date: '2024-01-01',
        slot_id: 1,
        user_name: 'Done',
        user_id: 1,
        client_id: 1,
        visits_this_month: 0,
        approved_bookings_this_month: 0,
        is_staff_booking: false,
        reschedule_token: '',
        profile_link: '',
      },
      {
        id: 2,
        status: 'no_show',
        date: '2024-01-01',
        slot_id: 1,
        user_name: 'Flake',
        user_id: 2,
        client_id: 2,
        visits_this_month: 0,
        approved_bookings_this_month: 0,
        is_staff_booking: false,
        reschedule_token: '',
        profile_link: '',
      },
      {
        id: 3,
        status: 'cancelled',
        date: '2024-01-01',
        slot_id: 1,
        user_name: 'Cancel',
        user_id: 3,
        client_id: 3,
        visits_this_month: 0,
        approved_bookings_this_month: 0,
        is_staff_booking: false,
        reschedule_token: '',
        profile_link: '',
      },
    ]);
    render(
      <MemoryRouter>
        <PantrySchedule />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Done (1)')).toBeInTheDocument();
    expect(await screen.findByText('Flake (2)')).toBeInTheDocument();
    expect(screen.queryByText('Cancel (3)')).toBeNull();
  });
});

describe('PantrySchedule Wednesday evening slot', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-19T00:00:00-06:00'));
    (bookingApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '2', startTime: '18:30:00', endTime: '19:00:00', available: 1, maxCapacity: 1 },
    ]);
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([]);
    (bookingApi.getHolidays as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows 6:30 PM–7:00 PM slot', async () => {
    render(
      <MemoryRouter>
        <PantrySchedule />
      </MemoryRouter>,
    );
    expect(await screen.findByText('6:30 PM - 7:00 PM')).toBeInTheDocument();
  });
});
