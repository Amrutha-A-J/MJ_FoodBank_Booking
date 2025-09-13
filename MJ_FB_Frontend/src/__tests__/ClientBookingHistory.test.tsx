import { MemoryRouter } from 'react-router-dom';
import { renderWithProviders, screen, waitFor } from '../../testUtils/renderWithProviders';
import UserHistory from '../pages/staff/client-management/UserHistory';
import { getBookingHistory, getSlots, cancelBooking, rescheduleBookingByToken } from '../api/bookings';
import { deleteClientVisit } from '../api/clientVisits';

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn(),
  getSlots: jest.fn(),
  cancelBooking: jest.fn(),
  rescheduleBookingByToken: jest.fn(),
}));

jest.mock('../api/clientVisits', () => ({
  deleteClientVisit: jest.fn(),
}));

describe('Client booking history', () => {
  beforeEach(() => {
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Test Client');
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('does not show Edit Client button for clients', async () => {
    renderWithProviders(
      <MemoryRouter>
        <UserHistory initialUser={{ name: 'Test Client', client_id: 1 }} />
      </MemoryRouter>
    );

    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Edit Client/i })).toBeNull();
  });
});
