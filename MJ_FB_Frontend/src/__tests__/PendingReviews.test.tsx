import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PendingReviews from '../pages/volunteer-management/PendingReviews';
import {
  getVolunteerBookingsForReview,
  updateVolunteerBookingStatus,
} from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  getVolunteerBookingsForReview: jest.fn(),
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
    date: '2024-01-02',
    start_time: '09:00:00',
    end_time: '12:00:00',
  },
  {
    id: 2,
    status: 'no_show',
    role_id: 1,
    volunteer_id: 2,
    volunteer_name: 'Bob',
    role_name: 'Pantry',
    date: '2024-01-02',
    start_time: '13:00:00',
    end_time: '15:00:00',
  },
];

describe('PendingReviews', () => {
  beforeEach(() => {
    (getVolunteerBookingsForReview as jest.Mock).mockResolvedValue(sample);
    (updateVolunteerBookingStatus as jest.Mock).mockResolvedValue(undefined);
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2024-01-02T16:00:00-06:00').valueOf());
  });

  afterEach(() => {
    (Date.now as jest.Mock).mockRestore();
  });

  it('bulk updates selected bookings', async () => {
    render(<PendingReviews />);

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByRole('button', { name: /mark completed/i }));
    await waitFor(() =>
      expect(updateVolunteerBookingStatus).toHaveBeenCalledWith(1, 'completed'),
    );
  });
});
