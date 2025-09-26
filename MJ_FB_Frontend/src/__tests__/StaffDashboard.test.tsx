import { render, screen, waitFor, act, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';
import { getBookings, getHolidays } from '../api/bookings';
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
  getHolidays: jest.fn(),
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

let queryClient: QueryClient;

async function renderStaffDashboard(element = <Dashboard role="staff" />) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{element}</MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

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
    (getHolidays as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    queryClient?.clear();
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

    await renderStaffDashboard();

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

    await renderStaffDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Staff Meeting/)).toBeInTheDocument();
    });
  });

  it('shows upcoming holidays within 30 days', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-01T12:00:00Z'));
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getHolidays as jest.Mock).mockResolvedValue([
      { date: '2024-05-04', reason: 'Warehouse Cleanup' },
      { date: '2024-06-05', reason: 'Too Far' },
    ]);

    await renderStaffDashboard();

    await waitFor(() => expect(getHolidays).toHaveBeenCalled());
    expect(await screen.findByText('Upcoming Holidays')).toBeInTheDocument();
    expect(screen.getByText('May 4 (Sat) – Warehouse Cleanup')).toBeInTheDocument();
    expect(screen.queryByText('Jun 5 (Wed) – Too Far')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('hides upcoming holidays when none are returned', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getHolidays as jest.Mock).mockResolvedValue([]);

    await renderStaffDashboard();

    await waitFor(() => expect(getHolidays).toHaveBeenCalled());
    expect(screen.queryByText('Upcoming Holidays')).not.toBeInTheDocument();
  });

  it('shows staff leave events separately from other events', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Fundraiser Meeting',
          startDate: '2024-03-01',
          endDate: '2024-03-01',
          createdBy: 1,
          createdByName: 'Alice',
          category: 'fundraiser',
          priority: 0,
        },
        {
          id: 2,
          title: 'Taylor PTO',
          startDate: '2024-03-05',
          endDate: '2024-03-07',
          createdBy: 2,
          createdByName: 'Taylor',
          category: 'staff leave',
          priority: 0,
        },
      ],
      upcoming: [],
      past: [],
    });

    await renderStaffDashboard();

    const newsCardTitle = await screen.findByText('News & Events');
    const staffLeaveCardTitle = await screen.findByText('Staff Leave Notices');
    const newsCard = newsCardTitle.closest('.MuiCard-root');
    const staffLeaveCard = staffLeaveCardTitle.closest('.MuiCard-root');

    expect(newsCard).not.toBeNull();
    expect(staffLeaveCard).not.toBeNull();
    expect(
      within(newsCard as HTMLElement).getByText(/Fundraiser Meeting/),
    ).toBeInTheDocument();
    expect(
      within(staffLeaveCard as HTMLElement).getByText(/Taylor PTO/),
    ).toBeInTheDocument();
    expect(
      within(newsCard as HTMLElement).queryByText(/Taylor PTO/),
    ).not.toBeInTheDocument();
  });

  it('hides pantry quick links when disabled', async () => {
    await renderStaffDashboard(<Dashboard role="staff" showPantryQuickLinks={false} />);

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

    await renderStaffDashboard();

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

    await renderStaffDashboard();

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

    await renderStaffDashboard();

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
