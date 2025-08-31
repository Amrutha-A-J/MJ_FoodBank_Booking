import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AgencyDashboard from '../pages/agency/AgencyDashboard';
import { getMyAgencyClients } from '../api/agencies';
import { getBookings, getSlots, getHolidays, cancelBooking } from '../api/bookings';
import { getEvents } from '../api/events';

jest.mock('../api/agencies', () => ({
  getMyAgencyClients: jest.fn(),
}));

jest.mock('../api/bookings', () => ({
  getBookings: jest.fn(),
  getSlots: jest.fn(),
  getHolidays: jest.fn(),
  cancelBooking: jest.fn(),
}));

jest.mock('../api/events', () => ({ getEvents: jest.fn() }));

describe('AgencyDashboard', () => {
  it('renders aggregated bookings', async () => {
    (getMyAgencyClients as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    (getBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        date: '2024-01-15',
        user_name: 'Client A',
      },
    ]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([
      {
        date: '2024-01-20',
        reason: 'Closed',
      },
    ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    render(
      <MemoryRouter>
        <AgencyDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getBookings).toHaveBeenCalled());
    expect(screen.getByText(/Client A/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Mon, Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Sat, Jan 20, 2024 Closed/)).toBeInTheDocument();
    });
  });
});
