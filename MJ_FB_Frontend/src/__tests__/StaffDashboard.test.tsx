import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';
import { getBookings } from '../api/bookings';
import { getEvents } from '../api/events';
import { getPantryMonthly } from '../api/pantryAggregations';
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

jest.mock('../api/pantryAggregations', () => ({
  getPantryMonthly: jest.fn(),
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
    (getPantryMonthly as jest.Mock)
      .mockResolvedValueOnce([
        { month: 1, orders: 2, adults: 1, children: 1 },
        { month: 2, orders: 3, adults: 2, children: 1 },
      ])
      .mockResolvedValueOnce([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard role="staff" />
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Total Clients')).toBeInTheDocument();
    });
    await waitFor(() => expect(getPantryMonthly).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.queryByText('Pantry Schedule (This Week)')).toBeNull();
    });
  });

  it('shows events returned by the API', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getPantryMonthly as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Staff Meeting',
          startDate: '2024-01-01',
          endDate: '2024-01-01',
          createdBy: 1,
          createdByName: 'Alice',
          priority: 0,
        },
      ],
      upcoming: [],
      past: [],
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard role="staff" />
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Staff Meeting/)).toBeInTheDocument();
    });
  });

  it('hides pantry quick links when disabled', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard role="staff" showPantryQuickLinks={false} />
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(mockUseBreadcrumbActions).toHaveBeenCalledWith(null);
    });
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
    (getPantryMonthly as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [],
      upcoming: [],
      past: [],
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard role="staff" />
        </MemoryRouter>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Recent Cancellations')).toBeInTheDocument();
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.queryByText(/Bob/)).toBeNull();
    });
  });
});
