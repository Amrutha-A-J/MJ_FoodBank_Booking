import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';
import { getBookings } from '../api/bookings';
import { getEvents } from '../api/events';
import { getVisitStats } from '../api/clientVisits';
import { getVolunteerBookings, getVolunteerRoles } from '../api/volunteers';
import { formatReginaDate } from '../utils/time';

const mockUseBreadcrumbActions = jest.fn();
jest.mock('../components/layout/MainLayout', () => ({
  useBreadcrumbActions: (actions: unknown) => mockUseBreadcrumbActions(actions),
}));

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

beforeEach(() => {
  jest.clearAllMocks();
});

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

    await screen.findByText('Total Clients');
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

  it('hides pantry quick links when disabled', () => {
    render(
      <MemoryRouter>
        <Dashboard role="staff" showPantryQuickLinks={false} />
      </MemoryRouter>,
    );

    expect(mockUseBreadcrumbActions).toHaveBeenCalledWith(null);
  });

  it('shows only today\'s cancellations', async () => {
    const today = formatReginaDate(new Date());
    const yesterday = formatReginaDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );
    (getBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'cancelled',
        date: today,
        start_time: '09:00:00',
        user_name: 'Alice',
      },
      {
        id: 2,
        status: 'cancelled',
        date: yesterday,
        start_time: '10:00:00',
        user_name: 'Bob',
      },
    ]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getVisitStats as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [],
      upcoming: [],
      past: [],
    });

    render(
      <MemoryRouter>
        <Dashboard role="staff" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Recent Cancellations')).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.queryByText(/Bob/)).toBeNull();
  });
});
