import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';
import { getBookings, getSlotsRange } from '../api/bookings';
import { getEvents } from '../api/events';
import { getVolunteerNoShowRanking } from '../api/volunteers';

jest.mock('../api/bookings', () => ({
  getBookings: jest.fn(),
  getSlotsRange: jest.fn(),
}));

jest.mock('../api/events', () => ({
  getEvents: jest.fn(),
}));

jest.mock('../api/volunteers', () => ({
  getVolunteerNoShowRanking: jest.fn(),
}));

describe('StaffDashboard', () => {
  it('displays no-show ranking', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getSlotsRange as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getVolunteerNoShowRanking as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Alice', totalBookings: 10, noShows: 4, noShowRate: 0.4 },
    ]);

    render(
      <MemoryRouter>
        <Dashboard role="staff" />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getVolunteerNoShowRanking).toHaveBeenCalled());
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/4\/10/)).toBeInTheDocument();
    expect(screen.getByText(/40%/)).toBeInTheDocument();
  });
});
