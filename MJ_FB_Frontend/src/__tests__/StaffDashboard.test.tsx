import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';
import { getBookings } from '../api/bookings';
import { getEvents } from '../api/events';
import { getVisitStats } from '../api/clientVisits';
import { getVolunteerBookings, getVolunteerRoles } from '../api/volunteers';

jest.mock('../api/bookings', () => ({
  getBookings: jest.fn(),
}));

jest.mock('../api/events', () => ({
  getEvents: jest.fn(),
}));

jest.mock('../api/clientVisits', () => ({
  getVisitStats: jest.fn(),
}));

jest.mock('../api/volunteers', () => ({
  getVolunteerBookings: jest.fn(),
  getVolunteerRoles: jest.fn(),
}));

describe('StaffDashboard', () => {
  it('does not display no-show rankings card', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getVisitStats as jest.Mock).mockResolvedValue([
      { month: '2024-01', clients: 2, adults: 1, children: 1 },
      { month: '2024-02', clients: 3, adults: 2, children: 1 },
    ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    render(
      <MemoryRouter>
        <Dashboard role="staff" />
      </MemoryRouter>,
    );

    await screen.findByText('Pantry Visit Trend');
    expect(getVisitStats).toHaveBeenCalled();
    expect(screen.queryByText('Pantry Schedule (This Week)')).toBeNull();
  });

  it('shows events returned by the API', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getVisitStats as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Staff Meeting',
          startDate: '2024-01-01',
          endDate: '2024-01-01',
          createdBy: 1,
          createdByName: 'Alice',
        },
      ],
      upcoming: [],
      past: [],
    });

    render(
      <MemoryRouter>
        <Dashboard role="staff" />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Staff Meeting/)).toBeInTheDocument();
  });
});
