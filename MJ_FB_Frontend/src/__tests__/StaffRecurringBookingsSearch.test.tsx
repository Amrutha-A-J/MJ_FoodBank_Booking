import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import StaffRecurringBookings from '../pages/volunteer-management/StaffRecurringBookings';
import {
  searchVolunteers,
  getVolunteerRoles,
  getRecurringVolunteerBookingsForVolunteer,
  getVolunteerBookingHistory,
  createRecurringVolunteerBookingForVolunteer,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
} from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  searchVolunteers: jest.fn(),
  getVolunteerRoles: jest.fn(),
  getRecurringVolunteerBookingsForVolunteer: jest.fn(),
  getVolunteerBookingHistory: jest.fn(),
  createRecurringVolunteerBookingForVolunteer: jest.fn(),
  cancelVolunteerBooking: jest.fn(),
  cancelRecurringVolunteerBooking: jest.fn(),
}));

describe('StaffRecurringBookings volunteer search', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (searchVolunteers as jest.Mock).mockResolvedValue([
      { id: 7, name: 'Test Vol', trainedAreas: [], hasShopper: false, hasPassword: false, clientId: null },
    ]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getRecurringVolunteerBookingsForVolunteer as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('searches for volunteers and selects one', async () => {
    render(<StaffRecurringBookings />);
    const input = screen.getByLabelText(/search/i);
    fireEvent.change(input, { target: { value: 'Test' } });
    act(() => jest.advanceTimersByTime(300));

    await waitFor(() => expect(searchVolunteers).toHaveBeenCalledWith('Test'));

    const button = await screen.findByRole('button', { name: 'Test Vol' });
    fireEvent.click(button);

    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
    expect(await screen.findByText(/add a recurring shift/i)).toBeInTheDocument();
  });
});
