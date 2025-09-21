import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
  act,
} from '@testing-library/react';
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

    const [signUpBtn] = await screen.findAllByRole('button', { name: '' });
    fireEvent.click(signUpBtn);
    await screen.findByRole('dialog');
    const searchInput = await screen.findByLabelText(
      /Search users by name\/email\/phone\/client ID/,
    );
    fireEvent.change(searchInput, { target: { value: 'Tes' } });
    act(() => {
      jest.runOnlyPendingTimers();
    });
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

    const [signUpBtn] = await screen.findAllByRole('button', { name: '' });
    fireEvent.click(signUpBtn);
    await screen.findByRole('dialog');
    const searchInput = await screen.findByLabelText(
      /Search users by name\/email\/phone\/client ID/,
    );
    fireEvent.change(searchInput, { target: { value: '123' } });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const addBtn = await screen.findByRole('button', {
      name: 'Add existing client to the app',
    });
    await act(async () => {
      fireEvent.click(addBtn);
    });

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

    const [signUpBtn] = await screen.findAllByRole('button', { name: '' });
    fireEvent.click(signUpBtn);
    await screen.findByLabelText(/Search users by name\/email\/phone\/client ID/);
    const newClientBox = await screen.findByRole('checkbox', {
      name: /new client/i,
    });
    fireEvent.click(newClientBox);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Someone New' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Assign new client' }));
    });

    await waitFor(() => {
      expect(bookingApi.createBookingForNewClient).toHaveBeenCalledWith(
        'Someone New',
        1,
        expect.any(String),
      );
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
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

describe('PantrySchedule small screen cards', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T08:00:00-06:00'));
    (bookingApi.getSlots as jest.Mock).mockResolvedValue([
      {
        id: '1',
        startTime: '09:00:00',
        endTime: '09:30:00',
        available: 1,
        maxCapacity: 1,
      },
    ]);
    (bookingApi.getBookings as jest.Mock).mockResolvedValue([]);
    (bookingApi.getHolidays as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders cards and opens assign dialog from empty slot', async () => {
    const matchMediaSpy = jest
      .spyOn(window, 'matchMedia')
      .mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

    try {
      render(
        <MemoryRouter>
          <PantrySchedule />
        </MemoryRouter>,
      );

      const slotHeader = await screen.findByText('9:00 AM - 9:30 AM');
      expect(slotHeader).toBeInTheDocument();
      expect(screen.queryByRole('columnheader', { name: 'Slot 1' })).toBeNull();

      const cardContent = slotHeader.closest('.MuiCardContent-root');
      expect(cardContent).not.toBeNull();
      const grid = (cardContent as HTMLElement).querySelector('[class*="MuiBox-root"]');
      expect(grid).not.toBeNull();
      const clickableCell = (grid as HTMLElement).firstElementChild as HTMLElement | null;
      expect(clickableCell).not.toBeNull();

      fireEvent.click(clickableCell as HTMLElement);

      expect(await screen.findByRole('dialog', { name: 'Assign User' })).toBeInTheDocument();
    } finally {
      matchMediaSpy.mockRestore();
    }
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

