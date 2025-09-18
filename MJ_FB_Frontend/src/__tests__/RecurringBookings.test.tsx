import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '../../testUtils/renderWithProviders';
import { MemoryRouter } from 'react-router-dom';
import VolunteerSchedule from '../pages/volunteer-management/VolunteerSchedule';
import VolunteerBookingHistory from '../pages/volunteer-management/VolunteerBookingHistory';
import VolunteerRecurringBookings from '../pages/volunteer-management/VolunteerRecurringBookings';
import {
  getVolunteerRolesForVolunteer,
  getMyVolunteerBookings,
  getRecurringVolunteerBookings,
  requestVolunteerBooking,
  createRecurringVolunteerBooking,
  getVolunteerBookingsByRoles,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
  resolveVolunteerBookingConflict,
  rescheduleVolunteerBookingByToken,
  getRoles,
} from '../api/volunteers';
import { getHolidays } from '../api/bookings';

jest.mock('../api/volunteers', () => ({
  getVolunteerRolesForVolunteer: jest.fn(),
  getMyVolunteerBookings: jest.fn(),
  requestVolunteerBooking: jest.fn(),
  createRecurringVolunteerBooking: jest.fn(),
  getVolunteerBookingsByRoles: jest.fn(),
  cancelVolunteerBooking: jest.fn(),
  cancelRecurringVolunteerBooking: jest.fn(),
  resolveVolunteerBookingConflict: jest.fn(),
  getRecurringVolunteerBookings: jest.fn(),
  rescheduleVolunteerBookingByToken: jest.fn(),
  getRoles: jest.fn(),
}));
jest.mock('../api/bookings', () => ({
  getHolidays: jest.fn(),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-04-30T06:00:00Z'));
  (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
    {
      id: 1,
      role_id: 1,
      name: 'Test Role',
      start_time: '09:00:00',
      end_time: '10:00:00',
      max_volunteers: 1,
      booked: 0,
      available: 1,
      status: 'available',
      date: '2024-04-30',
      category_id: 1,
      category_name: 'Cat',
      is_wednesday_slot: false,
    },
  ]);
  (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
  (getRecurringVolunteerBookings as jest.Mock).mockResolvedValue([]);
  (getHolidays as jest.Mock).mockResolvedValue([]);
  (requestVolunteerBooking as jest.Mock).mockResolvedValue(undefined);
  (createRecurringVolunteerBooking as jest.Mock).mockResolvedValue(undefined);
  (getVolunteerBookingsByRoles as jest.Mock).mockResolvedValue([]);
  (cancelVolunteerBooking as jest.Mock).mockResolvedValue(undefined);
  (cancelRecurringVolunteerBooking as jest.Mock).mockResolvedValue(undefined);
  (rescheduleVolunteerBookingByToken as jest.Mock).mockResolvedValue(undefined);
  (getRoles as jest.Mock).mockResolvedValue([]);
});

afterEach(async () => {
  await act(async () => {
    try {
      jest.runOnlyPendingTimers();
    } catch {
      // ignore timers not handled by Jest
    }
  });
  jest.useRealTimers();
  jest.clearAllMocks();
});

test('submits weekly recurring booking', async () => {
  renderWithProviders(
    <MemoryRouter>
      <VolunteerRecurringBookings />
    </MemoryRouter>,
  );
  fireEvent.mouseDown(await screen.findByLabelText(/role/i));
  let listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText('Test Role (9:00 AM–10:00 AM)'));
  const frequencySelect = screen.getByLabelText(/frequency/i);
  fireEvent.mouseDown(frequencySelect);
  listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText('Weekly'));
  fireEvent.click(screen.getByLabelText('Mon'));
  fireEvent.click(screen.getByLabelText('Wed'));
  fireEvent.change(screen.getByLabelText(/end date/i), {
    target: { value: '2024-12-31' },
  });
  await act(async () => {
    fireEvent.submit(document.querySelector('form')!);
  });
  await waitFor(() =>
    expect(createRecurringVolunteerBooking).toHaveBeenCalled(),
  );
  const args = (createRecurringVolunteerBooking as jest.Mock).mock.calls[0];
  expect(args[0]).toBe(1);
  expect(args[2]).toBe('weekly');
  expect(args[3]).toEqual(expect.arrayContaining([1, 3]));
});

test('shows validation when end date missing', async () => {
  renderWithProviders(
    <MemoryRouter>
      <VolunteerRecurringBookings />
    </MemoryRouter>,
  );
  fireEvent.mouseDown(await screen.findByLabelText(/role/i));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText('Test Role (9:00 AM–10:00 AM)'));
  const endDateField = screen.getByLabelText(/end date/i);
  await act(async () => {
    fireEvent.submit(document.querySelector('form')!);
  });
  expect(createRecurringVolunteerBooking).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(endDateField).toHaveAccessibleDescription('Select an end date'),
  );
});

test('submits daily recurring booking with end date', async () => {
  renderWithProviders(
    <MemoryRouter>
      <VolunteerRecurringBookings />
    </MemoryRouter>,
  );
  fireEvent.mouseDown(await screen.findByLabelText(/role/i));
  let listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText('Test Role (9:00 AM–10:00 AM)'));
  fireEvent.change(screen.getByLabelText(/end date/i), {
    target: { value: '2024-12-31' },
  });
  await act(async () => {
    fireEvent.submit(document.querySelector('form')!);
  });
  await waitFor(() => expect(createRecurringVolunteerBooking).toHaveBeenCalled());
  const args = (createRecurringVolunteerBooking as jest.Mock).mock.calls[0];
  expect(args[2]).toBe('daily');
  expect(args[3]).toBeUndefined();
  expect(args[4]).toBe('2024-12-31');
});

test('submits one-time booking', async () => {
  renderWithProviders(
    <MemoryRouter>
      <VolunteerSchedule />
    </MemoryRouter>,
  );
  fireEvent.mouseDown(await screen.findByLabelText(/department/i));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText('Cat'));
  const table = await screen.findByRole('table');
  const slot = within(table).getByRole('button', { name: /sign up/i });
  await act(async () => {
    fireEvent.click(slot);
  });
  await waitFor(() => expect(requestVolunteerBooking).toHaveBeenCalled());
  expect(createRecurringVolunteerBooking).not.toHaveBeenCalled();
});

test('cancels single and recurring bookings', async () => {
  (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
    {
      id: 1,
      role_id: 1,
      role_name: 'Role1',
      date: '2024-05-01',
      start_time: '09:00:00',
      end_time: '10:00:00',
      status: 'approved',
      recurring_id: 5,
    },
    {
      id: 2,
      role_id: 1,
      role_name: 'Role1',
      date: '2024-05-08',
      start_time: '09:00:00',
      end_time: '10:00:00',
      status: 'approved',
      recurring_id: 5,
    },
    {
      id: 3,
      role_id: 2,
      role_name: 'Role2',
      date: '2024-05-02',
      start_time: '11:00:00',
      end_time: '12:00:00',
      status: 'approved',
    },
  ]);
  renderWithProviders(
    <MemoryRouter>
      <VolunteerBookingHistory />
    </MemoryRouter>,
  );
  const cancelButtons = await screen.findAllByText('Cancel');
  await act(async () => {
    fireEvent.click(cancelButtons[2]);
  });
  const confirmButton = await screen.findByRole('button', { name: /confirm/i });
  await act(async () => {
    fireEvent.click(confirmButton);
  });
  await waitFor(() =>
    expect(cancelVolunteerBooking).toHaveBeenCalledWith(3),
  );
  const cancelAllButtons = await screen.findAllByText('Cancel all upcoming');
  await act(async () => {
    fireEvent.click(cancelAllButtons[0]);
  });
  const confirmAllButton = await screen.findByRole('button', { name: /confirm/i });
  await act(async () => {
    fireEvent.click(confirmAllButton);
  });
  await waitFor(() =>
    expect(cancelRecurringVolunteerBooking).toHaveBeenCalledWith(5),
  );
});

test('reschedules booking', async () => {
  (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
    {
      id: 1,
      role_id: 1,
      role_name: 'Role1',
      date: '2024-05-01',
      start_time: '09:00:00',
      end_time: '10:00:00',
      status: 'approved',
      reschedule_token: 'abc',
    },
  ]);
  (getRoles as jest.Mock).mockResolvedValue([
    { roleId: 1, roleName: 'Role1', categoryName: 'Cat' },
  ]);
  renderWithProviders(
    <MemoryRouter>
      <VolunteerBookingHistory />
    </MemoryRouter>,
  );
  const rescheduleButton = await screen.findByText('Reschedule');
  await act(async () => {
    fireEvent.click(rescheduleButton);
  });
  const dateField = await screen.findByLabelText(/date/i);
  await act(async () => {
    fireEvent.change(dateField, {
      target: { value: '2024-05-02' },
    });
  });
  const roleField = await screen.findByRole('combobox', { name: /role/i });
  await waitFor(() => expect(roleField).not.toHaveAttribute('aria-disabled'));
  await act(async () => {
    fireEvent.mouseDown(roleField);
  });
  const listbox = await screen.findByRole('listbox');
  await act(async () => {
    fireEvent.click(within(listbox).getByText(/Test Role 9:00 AM–10:00 AM/));
  });
  const submitButton = screen.getByRole('button', { name: /submit/i });
  await act(async () => {
    fireEvent.click(submitButton);
  });
  await waitFor(() =>
    expect(rescheduleVolunteerBookingByToken).toHaveBeenCalledWith(
      'abc',
      1,
      '2024-05-02',
    ),
  );
});

test('hides cancel options for non-approved bookings', async () => {
  (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
    {
      id: 1,
      role_id: 1,
      role_name: 'Completed Role',
      date: '2024-05-01',
      start_time: '09:00:00',
      end_time: '10:00:00',
      status: 'completed',
    },
    {
      id: 2,
      role_id: 1,
      role_name: 'Cancelled Role',
      date: '2024-05-02',
      start_time: '09:00:00',
      end_time: '10:00:00',
      status: 'cancelled',
    },
    {
      id: 3,
      role_id: 1,
      role_name: 'NoShow Role',
      date: '2024-05-03',
      start_time: '09:00:00',
      end_time: '10:00:00',
      status: 'no_show',
    },
    {
      id: 4,
      role_id: 1,
      role_name: 'Approved Role',
      date: '2024-05-04',
      start_time: '09:00:00',
      end_time: '10:00:00',
      status: 'approved',
    },
  ]);

  renderWithProviders(
    <MemoryRouter>
      <VolunteerBookingHistory />
    </MemoryRouter>,
  );
  await screen.findByText('Approved Role');
  expect(screen.getAllByText('Cancel')).toHaveLength(1);
  const completedRow = screen.getByText('Completed Role').closest('tr')!;
  expect(within(completedRow).queryByText('Cancel')).toBeNull();
  const cancelledRow = screen.getByText('Cancelled Role').closest('tr')!;
  expect(within(cancelledRow).queryByText('Cancel')).toBeNull();
  const noShowRow = screen.getByText('NoShow Role').closest('tr')!;
  expect(within(noShowRow).queryByText('Cancel')).toBeNull();
});

test('formats recurring booking dates', async () => {
  (getRecurringVolunteerBookings as jest.Mock).mockResolvedValue([
    {
      id: 1,
      role_id: 1,
      start_date: '2025-08-30T06:00:00.000Z',
      end_date: '2025-09-17T06:00:00.000Z',
      pattern: 'weekly',
      days_of_week: [1, 3],
    },
  ]);
  (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
    {
      id: 10,
      role_id: 1,
      role_name: 'Test Role',
      date: '2025-09-01T06:00:00.000Z',
      start_time: '09:00:00',
      end_time: '10:00:00',
      status: 'approved',
      recurring_id: 1,
    },
  ]);
  renderWithProviders(
    <MemoryRouter>
      <VolunteerRecurringBookings />
    </MemoryRouter>,
  );
  await act(async () => {
    fireEvent.click(
      screen.getByRole('tab', { name: /manage recurring shifts/i }),
    );
  });
  expect(
    await screen.findByText('Test Role (9:00 AM–10:00 AM)'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('2025-08-30 - 2025-09-17 · weekly (Mon, Wed)'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('2025-09-01 (9:00 AM–10:00 AM)'),
  ).toBeInTheDocument();
});

test('shows message when no recurring shifts', async () => {
  renderWithProviders(
    <MemoryRouter>
      <VolunteerRecurringBookings />
    </MemoryRouter>,
  );
  await act(async () => {
    fireEvent.click(
      screen.getByRole('tab', { name: /manage recurring shifts/i }),
    );
  });
  expect(
    await screen.findByText(/no recurring shift/i),
  ).toBeInTheDocument();
});

