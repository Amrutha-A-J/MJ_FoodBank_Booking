import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PendingReviews from '../pages/volunteer-management/PendingReviews';
import {
  getUnmarkedVolunteerBookings,
  updateVolunteerBookingStatus,
} from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  getUnmarkedVolunteerBookings: jest.fn(),
  updateVolunteerBookingStatus: jest.fn(),
}));

jest.mock('../components/ManageVolunteerShiftDialog', () => () => null);

const sample = [
  {
    id: 1,
    status: 'approved',
    role_id: 1,
    volunteer_id: 1,
    volunteer_name: 'Alice',
    role_name: 'Pantry',
    date: '2024-01-01',
    start_time: '09:00:00',
    end_time: '12:00:00',
  },
  {
    id: 2,
    status: 'approved',
    role_id: 1,
    volunteer_id: 2,
    volunteer_name: 'Bob',
    role_name: 'Pantry',
    date: '2024-01-02',
    start_time: '09:00:00',
    end_time: '12:00:00',
  },
];

describe('PendingReviews', () => {
  beforeEach(() => {
    (getUnmarkedVolunteerBookings as jest.Mock).mockResolvedValue(sample);
    (updateVolunteerBookingStatus as jest.Mock).mockResolvedValue(undefined);
  });

  it('bulk updates selected bookings', async () => {
    render(<PendingReviews />);

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    fireEvent.click(screen.getByRole('button', { name: /mark completed/i }));
    await waitFor(() => expect(updateVolunteerBookingStatus).toHaveBeenCalledTimes(2));
    expect(updateVolunteerBookingStatus).toHaveBeenCalledWith(1, 'completed');
    expect(updateVolunteerBookingStatus).toHaveBeenCalledWith(2, 'completed');
  });
});
