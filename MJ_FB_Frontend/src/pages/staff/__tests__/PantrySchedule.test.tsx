import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
import PantrySchedule from '../PantrySchedule';
import * as bookingApi from '../../../api/bookings';
import * as usersApi from '../../../api/users';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../api/bookings', () => ({
  getSlots: jest.fn(),
  getBookings: jest.fn(),
  getHolidays: jest.fn(),
  createBookingForUser: jest.fn(),
  createBookingForNewClient: jest.fn(),
}));

jest.mock('../../../api/users', () => ({
  addClientById: jest.fn(),
}));

describe('PantrySchedule add existing client workflow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-02T00:00:00-06:00'));
    (bookingApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 1, maxCapacity: 1 },
    ]);
    (bookingApi.getHolidays as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('shows client ID in search results', async () => {
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([]);
    const searchUsersMock = jest
      .fn()
      .mockResolvedValueOnce([
        {
          name: 'Test User',
          email: 'test@example.com',
          phone: null,
          client_id: 123,
          hasPassword: false,
        },
      ]);
    render(
      <MemoryRouter>
        <PantrySchedule searchUsersFn={searchUsersMock} />
      </MemoryRouter>,
    );

    const rows = await screen.findAllByRole('row');
    const cells = within(rows[1]).getAllByRole('cell');
    fireEvent.click(cells[1]);

    fireEvent.change(
      screen.getByLabelText('Search users by name/email/phone/client ID'),
      { target: { value: 'Tes' } },
    );

    expect(await screen.findByText('Test User (123)')).toBeInTheDocument();
  });

  it('adds existing client to the app when search returns none', async () => {
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([]);
    (usersApi.addClientById as jest.Mock).mockResolvedValue(undefined);
    const searchUsersMock = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          name: 'Test User',
          email: null,
          phone: null,
          client_id: 123,
          hasPassword: false,
        },
      ]);
    render(
      <MemoryRouter>
        <PantrySchedule searchUsersFn={searchUsersMock} />
      </MemoryRouter>,
    );

    const rows = await screen.findAllByRole('row');
    const cells = within(rows[1]).getAllByRole('cell');
    fireEvent.click(cells[1]);

    fireEvent.change(
      screen.getByLabelText('Search users by name/email/phone/client ID'),
      { target: { value: '123' } },
    );

    const addBtn = await screen.findByRole('button', {
      name: 'Add existing client to the app',
    });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(usersApi.addClientById).toHaveBeenCalledWith('123');
      expect(bookingApi.createBookingForUser).toHaveBeenCalledWith(
        123,
        1,
        expect.any(String),
        true,
      );
    });
  });

  it('assigns new client booking', async () => {
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([]);
    (bookingApi.createBookingForNewClient as jest.Mock).mockResolvedValue(
      undefined,
    );
    render(
      <MemoryRouter>
        <PantrySchedule />
      </MemoryRouter>,
    );

    const rows = await screen.findAllByRole('row');
    const cells = within(rows[1]).getAllByRole('cell');
    fireEvent.click(cells[1]);

    const newClientBox = await screen.findByRole('checkbox', {
      name: /new client/i,
    });
    fireEvent.click(newClientBox);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Someone New' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Assign new client' }));

    await waitFor(() => {
      expect(bookingApi.createBookingForNewClient).toHaveBeenCalledWith(
        'Someone New',
        1,
        expect.any(String),
      );
    });
  });
});

describe('PantrySchedule status display', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-02T00:00:00-06:00'));
    (bookingApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 2, maxCapacity: 2 },
    ]);
    (bookingApi.getHolidays as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
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

describe('PantrySchedule navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-02T00:00:00-06:00'));
    (bookingApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 1, maxCapacity: 1 },
    ]);
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([]);
    (bookingApi.getHolidays as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders slots after navigating past the current week', async () => {
    render(
      <MemoryRouter>
        <PantrySchedule />
      </MemoryRouter>,
    );

    await screen.findByText('9:00 AM - 9:30 AM');
    const nextBtn = screen.getByRole('button', { name: 'Next' });
    for (let i = 0; i < 7; i++) {
      fireEvent.click(nextBtn);
    }

    await waitFor(() => {
      expect(bookingApi.getSlots).toHaveBeenLastCalledWith('2024-01-09', true);
    });
    expect(await screen.findByText('9:00 AM - 9:30 AM')).toBeInTheDocument();
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

describe('PantrySchedule SSE connection indicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-02T00:00:00-06:00'));
    (bookingApi.getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 1, maxCapacity: 1 },
    ]);
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([]);
    (bookingApi.getHolidays as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    // @ts-expect-error cleanup
    delete global.EventSource;
  });

  it('shows indicator when EventSource errors', async () => {
    const esInstance: any = { close: jest.fn() };
    const esConstructor = jest.fn(() => esInstance);
    // @ts-expect-error mock EventSource
    global.EventSource = esConstructor;

    render(
      <MemoryRouter>
        <PantrySchedule />
      </MemoryRouter>,
    );

    await screen.findByText('9:00 AM - 9:30 AM');
    act(() => {
      esInstance.onerror?.(new Event('error'));
    });
    expect(await screen.findByText('Live updates unavailable')).toBeInTheDocument();
  });

  it('reconnects when retry is clicked', async () => {
    const esInstance: any = { close: jest.fn() };
    const esConstructor = jest.fn(() => esInstance);
    // @ts-expect-error mock EventSource
    global.EventSource = esConstructor;

    render(
      <MemoryRouter>
        <PantrySchedule />
      </MemoryRouter>,
    );

    await screen.findByText('9:00 AM - 9:30 AM');
    act(() => {
      esInstance.onerror?.(new Event('error'));
    });
    const retryBtn = await screen.findByRole('button', { name: 'Retry' });
    fireEvent.click(retryBtn);
    expect(esConstructor).toHaveBeenCalledTimes(2);
  });
});
