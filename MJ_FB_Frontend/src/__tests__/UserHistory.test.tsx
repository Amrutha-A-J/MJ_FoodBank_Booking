import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserHistory from '../pages/staff/client-management/UserHistory';
import { getBookingHistory, cancelBooking } from '../api/bookings';
import { getUserByClientId, updateUserInfo } from '../api/users';

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn(),
  cancelBooking: jest.fn(),
}));

jest.mock('../api/users', () => ({
  getUserByClientId: jest.fn(),
  updateUserInfo: jest.fn(),
}));

describe('UserHistory', () => {
  it('renders bookings and walk-in visits', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        date: '2024-01-01',
        start_time: '09:00:00',
        end_time: '10:00:00',
        created_at: '2024-01-01',
        slot_id: 1,
        is_staff_booking: false,
        reschedule_token: 't',
      },
      {
        id: 2,
        status: 'visited',
        date: '2024-01-02',
        start_time: null,
        end_time: null,
        created_at: '2024-01-02',
        slot_id: null,
        is_staff_booking: false,
        reschedule_token: null,
      },
    ]);

    render(
      <MemoryRouter>
        <UserHistory initialUser={{ id: 1, name: 'Test', client_id: 1 }} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(getBookingHistory).toHaveBeenCalledWith({ includeVisits: true });
    expect(await screen.findByText('approved')).toBeInTheDocument();
    expect(await screen.findByText('visited')).toBeInTheDocument();
  });
});

