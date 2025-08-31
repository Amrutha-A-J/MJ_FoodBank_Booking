import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    (searchVolunteers as jest.Mock).mockResolvedValue([
      { id: 7, name: 'Test Vol' },
    ]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getRecurringVolunteerBookingsForVolunteer as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookingHistory as jest.Mock).mockResolvedValue([]);
  });

  test('searches for volunteers and selects one', async () => {
    render(<StaffRecurringBookings />);
    const input = screen.getByLabelText(/search/i);
    fireEvent.change(input, { target: { value: 'Test' } });

    await waitFor(() => expect(searchVolunteers).toHaveBeenCalledWith('Test'));

    const button = await screen.findByRole('button', { name: 'Test Vol' });
    fireEvent.click(button);

    await waitFor(() => expect(getVolunteerRoles).toHaveBeenCalled());
    expect(await screen.findByText(/add a recurring shift/i)).toBeInTheDocument();
  });
});
