import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';
import { getBookings } from '../api/bookings';
import { getEvents } from '../api/events';
import { getPantryMonthly } from '../api/pantryAggregations';
import { getVolunteerBookings, getVolunteerRoles } from '../api/volunteers';
import { formatReginaDate } from '../utils/time';
import type { VisitStat } from '../api/clientVisits';

const mockVisitTrendChart = jest.fn();
const mockVisitBreakdownChart = jest.fn();

jest.mock('../components/dashboard/ClientVisitTrendChart', () => ({
  __esModule: true,
  default: (props: { data: VisitStat[] }) => {
    mockVisitTrendChart(props);
    return <div data-testid="staff-visit-trend-chart" />;
  },
}));

jest.mock('../components/dashboard/ClientVisitBreakdownChart', () => ({
  __esModule: true,
  default: (props: { data: VisitStat[] }) => {
    mockVisitBreakdownChart(props);
    return <div data-testid="staff-visit-breakdown-chart" />;
  },
}));

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

describe('StaffDashboard', () => {
  const fakeNow = new Date('2024-08-15T12:00:00Z');
  const currentYear = fakeNow.getFullYear();
  const currentMonth = fakeNow.getMonth() + 1;
  const futureMonth = currentMonth + 1;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeNow);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVisitTrendChart.mockClear();
    mockVisitBreakdownChart.mockClear();
    (getPantryMonthly as jest.Mock).mockResolvedValue([]);
  });

  it('does not display no-show rankings card', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getPantryMonthly as jest.Mock)
      .mockResolvedValueOnce([
        { month: currentMonth - 1, orders: 2, adults: 1, children: 1 },
        { month: currentMonth, orders: 3, adults: 2, children: 1 },
        { month: futureMonth, orders: 999, adults: 999, children: 999 },
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

  it('shows volunteer shift cancellations', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'cancelled',
        start_time: '09:00:00',
        volunteer_name: 'Alice',
      },
      {
        id: 2,
        status: 'approved',
        start_time: '10:00:00',
        volunteer_name: 'Bob',
      },
      {
        id: 3,
        status: 'cancelled',
        start_time: '11:00:00',
        volunteer_name: 'Charlie',
      },
    ]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
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
      expect(
        screen.getByText('Volunteer Shift Changes'),
      ).toBeInTheDocument();
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Charlie/)).toBeInTheDocument();
      expect(screen.queryByText(/Bob/)).toBeNull();
    });
  });

  it("shows only today's volunteer shift changes", async () => {
    const today = formatReginaDate(new Date());
    const tomorrow = formatReginaDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    );
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'cancelled',
        date: today,
        start_time: '09:00:00',
        volunteer_name: 'Charlie',
      },
      {
        id: 2,
        status: 'cancelled',
        date: tomorrow,
        start_time: '10:00:00',
        volunteer_name: 'Dana',
      },
    ]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
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
      expect(screen.getByText('Volunteer Shift Changes')).toBeInTheDocument();
      expect(screen.getByText(/Charlie/)).toBeInTheDocument();
      expect(screen.queryByText(/Dana/)).toBeNull();
    });
  });

  it('omits future months from visit charts', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getPantryMonthly as jest.Mock)
      .mockResolvedValueOnce([
        { month: currentMonth - 2, orders: 5, adults: 3, children: 2 },
        { month: currentMonth - 1, orders: 6, adults: 4, children: 2 },
        { month: currentMonth, orders: 7, adults: 5, children: 2 },
        { month: futureMonth, orders: 888, adults: 777, children: 666 },
      ])
      .mockResolvedValueOnce([
        { month: currentMonth - 2, orders: 4, adults: 2, children: 2 },
        { month: currentMonth - 1, orders: 3, adults: 1, children: 2 },
      ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await act(async () => {
      render(
        <MemoryRouter>
          <Dashboard role="staff" />
        </MemoryRouter>,
      );
    });

    await screen.findByTestId('staff-visit-trend-chart');

    const trendCall = mockVisitTrendChart.mock.calls.at(-1)?.[0];
    const breakdownCall = mockVisitBreakdownChart.mock.calls.at(-1)?.[0];
    const hasFutureMonth = (stats: VisitStat[] | undefined) =>
      !!stats?.some(stat => stat.month === `${currentYear}-${String(futureMonth).padStart(2, '0')}`);

    expect(hasFutureMonth(trendCall?.data)).toBe(false);
    expect(hasFutureMonth(breakdownCall?.data)).toBe(false);
    expect(screen.queryByText('888')).not.toBeInTheDocument();
  });
});
