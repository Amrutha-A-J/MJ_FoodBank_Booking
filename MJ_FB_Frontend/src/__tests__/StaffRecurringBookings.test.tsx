import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import StaffRecurringBookings from '../pages/volunteer-management/StaffRecurringBookings';
import {
  getVolunteerRoles,
  createRecurringVolunteerBookingForVolunteer,
  getRecurringVolunteerBookingsForVolunteer,
  getVolunteerBookingHistory,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
} from '../api/volunteers';

jest.mock('../components/EntitySearch', () => ({
  __esModule: true,
  default: ({ onSelect }: any) => (
    <button
      onClick={() =>
        onSelect({
          id: 7,
          name: 'Test Vol',
          trainedAreas: [],
          hasShopper: false,
          hasPassword: false,
          clientId: null,
        })
      }
    >
      Select Volunteer
    </button>
  ),
}));

jest.mock('../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  createRecurringVolunteerBookingForVolunteer: jest.fn(),
  getRecurringVolunteerBookingsForVolunteer: jest.fn(),
  getVolunteerBookingHistory: jest.fn(),
  cancelVolunteerBooking: jest.fn(),
  cancelRecurringVolunteerBooking: jest.fn(),
}));

afterAll(() => {
  jest.unmock('../components/EntitySearch');
  jest.unmock('../api/volunteers');
});

describe('StaffRecurringBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        category_id: 1,
        name: 'Role1',
        max_volunteers: 1,
        category_name: 'Cat',
        shifts: [
          {
            id: 10,
            start_time: '09:00:00',
            end_time: '10:00:00',
            is_wednesday_slot: false,
            is_active: true,
          },
        ],
      },
    ]);
    (getRecurringVolunteerBookingsForVolunteer as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);
    (createRecurringVolunteerBookingForVolunteer as jest.Mock).mockResolvedValue(undefined);
    (cancelVolunteerBooking as jest.Mock).mockResolvedValue(undefined);
    (cancelRecurringVolunteerBooking as jest.Mock).mockResolvedValue(undefined);
  });

  test('creates recurring booking for selected volunteer', async () => {
    render(<StaffRecurringBookings />);
    fireEvent.click(screen.getByText('Select Volunteer'));
    fireEvent.mouseDown(await screen.findByLabelText(/role/i));
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(screen.getByText(/Role1/));
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2024-12-31' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() =>
      expect(createRecurringVolunteerBookingForVolunteer).toHaveBeenCalled(),
    );
    const args = (createRecurringVolunteerBookingForVolunteer as jest.Mock).mock.calls[0];
    expect(args[0]).toBe(7);
    expect(args[1]).toBe(10);
  });

  test('requires end date before submitting', async () => {
    render(<StaffRecurringBookings />);
    fireEvent.click(screen.getByText('Select Volunteer'));
    fireEvent.mouseDown(await screen.findByLabelText(/role/i));
    await screen.findByRole('listbox');
    fireEvent.click(screen.getByText(/Role1/));
    const endDateField = screen.getByLabelText(/end date/i);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create/i }));
    });
    expect(createRecurringVolunteerBookingForVolunteer).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(endDateField).toHaveAccessibleDescription('Select an end date'),
    );
  });

  test('cancels recurring booking and occurrence', async () => {
    (getRecurringVolunteerBookingsForVolunteer as jest.Mock).mockResolvedValue([
      { id: 5, role_id: 1, start_date: '2024-05-01', end_date: null, pattern: 'daily' },
    ]);
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        role_name: 'Role1',
        date: '2099-01-01',
        start_time: '09:00:00',
        end_time: '10:00:00',
        status: 'approved',
        recurring_id: 5,
      },
    ]);
    render(<StaffRecurringBookings />);
    fireEvent.click(screen.getByText('Select Volunteer'));
    fireEvent.click(screen.getByRole('tab', { name: /manage recurring shifts/i }));
    const cancelOccur = await screen.findByRole('button', { name: /cancel occurrence/i });
    fireEvent.click(cancelOccur);
    await waitFor(() => expect(cancelVolunteerBooking).toHaveBeenCalledWith(1));
    fireEvent.click(screen.getByRole('button', { name: /cancel series/i }));
    await waitFor(() =>
      expect(cancelRecurringVolunteerBooking).toHaveBeenCalledWith(5),
    );
  });
});
