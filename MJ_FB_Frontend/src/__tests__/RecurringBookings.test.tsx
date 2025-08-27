import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import VolunteerSchedule from '../pages/volunteer-management/VolunteerSchedule';
import VolunteerBookingHistory from '../pages/volunteer-management/VolunteerBookingHistory';
import {
  getVolunteerRolesForVolunteer,
  getMyVolunteerBookings,
  requestVolunteerBooking,
  createRecurringVolunteerBooking,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
} from '../api/volunteers';
import { getHolidays } from '../api/bookings';

jest.mock('../api/volunteers', () => ({
  getVolunteerRolesForVolunteer: jest.fn(),
  getMyVolunteerBookings: jest.fn(),
  requestVolunteerBooking: jest.fn(),
  createRecurringVolunteerBooking: jest.fn(),
  cancelVolunteerBooking: jest.fn(),
  cancelRecurringVolunteerBooking: jest.fn(),
}));
jest.mock('../api/bookings', () => ({
  getHolidays: jest.fn(),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-05-01T00:00:00Z'));
  jest.clearAllMocks();
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
      date: '2024-01-01',
      category_id: 1,
      category_name: 'Cat',
      is_wednesday_slot: false,
    },
  ]);
  (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
  (getHolidays as jest.Mock).mockResolvedValue([]);
  (requestVolunteerBooking as jest.Mock).mockResolvedValue(undefined);
  (createRecurringVolunteerBooking as jest.Mock).mockResolvedValue(undefined);
  (cancelVolunteerBooking as jest.Mock).mockResolvedValue(undefined);
  (cancelRecurringVolunteerBooking as jest.Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

test('submits weekly recurring booking', async () => {
  render(<VolunteerSchedule />);
  fireEvent.mouseDown(await screen.findByLabelText(/role/i));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText('Test Role'));
  fireEvent.click(await screen.findByText('Volunteer Needed', { exact: false }));
  fireEvent.mouseDown(screen.getByLabelText(/frequency/i));
  const freqList = await screen.findAllByRole('listbox');
  fireEvent.click(within(freqList[freqList.length - 1]).getByText('Weekly'));
  fireEvent.click(screen.getByLabelText('Mon'));
  fireEvent.click(screen.getByLabelText('Wed'));
  fireEvent.change(screen.getByLabelText(/end date/i), {
    target: { value: '2024-12-31' },
  });
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  await waitFor(() =>
    expect(createRecurringVolunteerBooking).toHaveBeenCalled(),
  );
  const args = (createRecurringVolunteerBooking as jest.Mock).mock.calls[0];
  expect(args[0]).toBe(1);
  expect(args[2]).toBe('weekly');
  expect(args[3]).toEqual(expect.arrayContaining([1, 3]));
});

test('submits one-time booking', async () => {
  render(<VolunteerSchedule />);
  fireEvent.mouseDown(await screen.findByLabelText(/role/i));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByText('Test Role'));
  fireEvent.click(await screen.findByText('Available'));
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
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
  render(<VolunteerBookingHistory />);
  const cancelButtons = await screen.findAllByText('Cancel');
  fireEvent.click(cancelButtons[2]);
  fireEvent.click(await screen.findByRole('button', { name: /confirm/i }));
  await waitFor(() =>
    expect(cancelVolunteerBooking).toHaveBeenCalledWith(3),
  );
  const cancelAllButtons = await screen.findAllByText('Cancel all upcoming');
  fireEvent.click(cancelAllButtons[0]);
  fireEvent.click(await screen.findByRole('button', { name: /confirm/i }));
  await waitFor(() =>
    expect(cancelRecurringVolunteerBooking).toHaveBeenCalledWith(5),
  );
});

