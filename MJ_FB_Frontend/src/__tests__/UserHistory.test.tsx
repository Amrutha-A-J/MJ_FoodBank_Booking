import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserHistory from '../pages/staff/client-management/UserHistory';
import { getBookingHistory, cancelBooking } from '../api/bookings';
import { getUserByClientId, updateUserInfo } from '../api/users';
import { useAuth } from '../hooks/useAuth';

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn(),
  cancelBooking: jest.fn(),
}));

jest.mock('../api/users', () => ({
  getUserByClientId: jest.fn(),
  updateUserInfo: jest.fn(),
}));

jest.mock('../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('UserHistory', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ role: 'staff' } as any);
  });
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
        staff_note: 'bring ID',
      },
    ]);

    render(
      <MemoryRouter>
        <UserHistory initialUser={{ id: 1, name: 'Test', client_id: 1 }} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(getBookingHistory).toHaveBeenCalledWith({
      includeVisits: true,
      includeStaffNotes: true,
    });
    expect(await screen.findByText(/approved/i)).toBeInTheDocument();
    expect(await screen.findByText(/visited/i)).toBeInTheDocument();
    expect(screen.getByText(/bring ID/i)).toBeInTheDocument();
  });

  it('hides edit client button when initialUser is provided', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <UserHistory initialUser={{ id: 1, name: 'Test', client_id: 1 }} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(
      screen.queryByRole('button', { name: /edit client/i })
    ).not.toBeInTheDocument();
  });

  it('hides notes filter for non-staff users', async () => {
    mockUseAuth.mockReturnValue({ role: 'shopper' } as any);
    (getBookingHistory as jest.Mock).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <UserHistory initialUser={{ id: 1, name: 'Test', client_id: 1 }} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(
      screen.queryByLabelText('View visits with notes only')
    ).not.toBeInTheDocument();
  });

  it('filters visits with notes only', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'visited',
        date: '2024-01-01',
        start_time: null,
        end_time: null,
        created_at: '2024-01-01',
        slot_id: null,
        is_staff_booking: false,
        reschedule_token: null,
        staff_note: 'has staff note',
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
        client_note: 'client note here',
      },
      {
        id: 3,
        status: 'visited',
        date: '2024-01-03',
        start_time: null,
        end_time: null,
        created_at: '2024-01-03',
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
    expect(screen.getAllByText(/visited/i)).toHaveLength(3);

    fireEvent.click(screen.getByLabelText('View visits with notes only'));

    expect(screen.getAllByText(/visited/i)).toHaveLength(2);
    expect(screen.getByText(/has staff note/i)).toBeInTheDocument();
    expect(screen.getByText(/client note here/i)).toBeInTheDocument();
  });

  it('shows both client and staff note labels for visited bookings', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'visited',
        date: '2024-01-01',
        start_time: null,
        end_time: null,
        created_at: '2024-01-01',
        slot_id: null,
        is_staff_booking: false,
        reschedule_token: null,
        client_note: 'client note',
        staff_note: 'staff note',
      },
    ]);

    render(
      <MemoryRouter>
        <UserHistory initialUser={{ id: 1, name: 'Test', client_id: 1 }} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(screen.getByText(/Client note/i)).toBeInTheDocument();
    expect(screen.getByText(/Staff note/i)).toBeInTheDocument();
  });
});

