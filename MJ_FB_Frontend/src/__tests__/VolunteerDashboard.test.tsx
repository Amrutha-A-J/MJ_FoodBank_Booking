import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerDashboard from '../pages/volunteer-management/VolunteerDashboard';
import {
  getMyVolunteerBookings,
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  updateVolunteerBookingStatus,
  getVolunteerStats,
  getVolunteerLeaderboard,
  getVolunteerGroupStats,
  resolveVolunteerBookingConflict,
  type VolunteerStats,
} from '../api/volunteers';
import { getEvents } from '../api/events';
import { toDayjs, formatReginaDate } from '../utils/date';

jest.mock('../api/volunteers', () => ({
  getMyVolunteerBookings: jest.fn(),
  getVolunteerRolesForVolunteer: jest.fn(),
  requestVolunteerBooking: jest.fn(),
  updateVolunteerBookingStatus: jest.fn(),
  getVolunteerStats: jest.fn(),
  getVolunteerLeaderboard: jest.fn(),
  getVolunteerGroupStats: jest.fn(),
  resolveVolunteerBookingConflict: jest.fn(),
}));

jest.mock('../api/events', () => ({ getEvents: jest.fn() }));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ role: 'volunteer', userRole: '' }),
}));

jest.mock('../components/VolunteerBottomNav', () => ({
  __esModule: true,
  default: () => <div data-testid="volunteer-bottom-nav" />,
}));

jest.mock('../components/OnboardingModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/OverlapBookingDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/FeedbackSnackbar', () => ({
  __esModule: true,
  default: ({ message }: { message: string }) =>
    message ? <div role="alert">{message}</div> : null,
}));

jest.mock('../components/dashboard/VolunteerGroupStatsCard', () => {
  const React = require('react');
  const { getVolunteerGroupStats } = require('../api/volunteers');
  return {
    __esModule: true,
    default: () => {
      getVolunteerGroupStats();
      return React.createElement('div', {
        'data-testid': 'group-progress-gauge',
      });
    },
  };
});

jest.mock('../components/dashboard/PersonalContributionChart', () => ({
  __esModule: true,
  default: () => <div data-testid="contribution-chart" />,
}));

const baseStats: VolunteerStats = {
  badges: [],
  lifetimeHours: 0,
  monthHours: 0,
  totalShifts: 0,
  currentStreak: 0,
  milestone: null,
  milestoneText: null,
  familiesServed: 0,
  poundsHandled: 0,
  monthFamiliesServed: 0,
  monthPoundsHandled: 0,
};

function makeStats(overrides: Partial<VolunteerStats> = {}): VolunteerStats {
  return { ...baseStats, ...overrides };
}

async function renderDashboard() {
  await act(async () => {
    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );
  });

  act(() => {
    jest.runOnlyPendingTimers();
  });
}

describe('VolunteerDashboard', () => {
  beforeEach(() => {
    const now = Date.now();
    jest.useFakeTimers();
    jest.setSystemTime(now);
    (getVolunteerLeaderboard as jest.Mock).mockResolvedValue({ rank: 1, percentile: 100 });
    (getVolunteerGroupStats as jest.Mock).mockResolvedValue({
      totalHours: 0,
      monthHours: 0,
      monthHoursGoal: 0,
      totalLbs: 0,
      weekLbs: 0,
      monthLbs: 0,
      monthFamilies: 0,
    });
    (getVolunteerStats as jest.Mock).mockResolvedValue(makeStats());
    localStorage.clear();
    localStorage.setItem('volunteerOnboarding', 'true');
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.setSystemTime(undefined);
    jest.useRealTimers();
  });

  it('does not show update trained roles button', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderDashboard();

    await screen.findByText('Profile & Training');
    expect(screen.queryByText('Update trained roles')).not.toBeInTheDocument();
  });
  it('shows events in News & Events section', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Volunteer Event',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          createdBy: 1,
          createdByName: 'Staff',
          priority: 0,
        },
      ],
      upcoming: [],
      past: [],
    });

    await renderDashboard();

    await waitFor(() => expect(getEvents).toHaveBeenCalled());
    expect(await screen.findByText(/Volunteer Event/)).toBeInTheDocument();
  });

  it('preserves line breaks in event details', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Volunteer Event',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          createdBy: 1,
          createdByName: 'Staff',
          priority: 0,
          details: 'First line\nSecond line',
        },
      ],
      upcoming: [],
      past: [],
    });

    await renderDashboard();

    const details = await screen.findByText(
      (_, element) => element?.textContent === 'First line\nSecond line',
    );
    expect(details).toBeInTheDocument();
    expect(window.getComputedStyle(details).whiteSpace).toBe('pre-line');
  });

  it('shows an error message if events cannot be fetched', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockRejectedValue(new Error('fail'));

    await renderDashboard();

    await waitFor(() => expect(getEvents).toHaveBeenCalled());
    expect(await screen.findByText('Failed to load events')).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('hides slots already booked by volunteer', async () => {
    const base = toDayjs('2030-01-29T00:00', 'America/Regina');
    jest.setSystemTime(base.toDate());
    const today = formatReginaDate(base);
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        role_id: 1,
        date: today,
        start_time: '09:00:00',
        end_time: '12:00:00',
        role_name: 'Greeter',
      },
    ]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 3,
        booked: 1,
        available: 2,
        status: 'available',
        date: today,
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderDashboard();

    await waitFor(() => expect(getVolunteerStats).toHaveBeenCalled());
    expect(await screen.findByText('No available shifts')).toBeInTheDocument();
  });

  it('excludes past shifts from available slots', async () => {
    const base = toDayjs('2030-01-29T00:00', 'America/Regina');
    jest.setSystemTime(base.set('hour', 13).toDate());

    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 3,
        booked: 0,
        available: 3,
        status: 'available',
          date: formatReginaDate(base),
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderDashboard();

    await waitFor(() => expect(getVolunteerRolesForVolunteer).toHaveBeenCalled());
    expect(await screen.findByText('No available shifts')).toBeInTheDocument();
  });

  it('lists upcoming available shifts', async () => {
    const base = toDayjs('2030-01-29T00:00', 'America/Regina');
    jest.setSystemTime(base.set('hour', 8).toDate());

    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 3,
        booked: 0,
        available: 3,
        status: 'available',
          date: formatReginaDate(base),
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderDashboard();

    await waitFor(() => expect(getVolunteerRolesForVolunteer).toHaveBeenCalled());
    const cardTitle = await screen.findByText('Available in My Roles');
    const card = cardTitle.closest('.MuiCard-root') as HTMLElement;
    expect(within(card).queryByText('No available shifts')).not.toBeInTheDocument();
  });

  it('filters available shifts by role', async () => {
    const base = toDayjs('2030-01-29T00:00', 'America/Regina');
    jest.setSystemTime(base.set('hour', 8).toDate());

    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 3,
        booked: 0,
        available: 3,
        status: 'available',
          date: formatReginaDate(base),
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
      {
        id: 2,
        role_id: 2,
        name: 'Warehouse',
        start_time: '13:00:00',
        end_time: '16:00:00',
        max_volunteers: 2,
        booked: 0,
        available: 2,
        status: 'available',
          date: formatReginaDate(base),
        category_id: 2,
        category_name: 'Back',
        is_wednesday_slot: false,
      },
    ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderDashboard();

    await waitFor(() => expect(getVolunteerRolesForVolunteer).toHaveBeenCalled());
    const cardTitle = await screen.findByText('Available in My Roles');
    const card = cardTitle.closest('.MuiCard-root') as HTMLElement;
    await act(async () => {
      fireEvent.mouseDown(screen.getByLabelText('Role'));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: 'Warehouse' }));
    });

    expect(within(card).queryByText(/Greeter/)).not.toBeInTheDocument();
    const list = within(card).getByRole('list');
    expect(within(list).getByText(/Warehouse/)).toBeInTheDocument();
  });

  it('shows server error when shift request fails', async () => {
    jest.setSystemTime(
      toDayjs('2024-01-10T06:00', 'America/Regina').toDate(),
    );

    const today = formatReginaDate(
      toDayjs('2024-01-15T00:00', 'America/Regina'),
    );
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '09:00:00',
        end_time: '12:00:00',
        max_volunteers: 3,
        booked: 0,
        available: 3,
        status: 'available',
        date: today,
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (requestVolunteerBooking as jest.Mock).mockRejectedValue(
      new Error('Already booked for this shift'),
    );

    await renderDashboard();

    await waitFor(() => expect(getVolunteerRolesForVolunteer).toHaveBeenCalled());
    await waitFor(() => expect(getMyVolunteerBookings).toHaveBeenCalled());
    const requestButton = await screen.findByRole('button', { name: /^Request$/ });
    await act(async () => {
      fireEvent.click(requestButton);
    });

    await waitFor(() => expect(requestVolunteerBooking).toHaveBeenCalled());
    expect(
      await screen.findByText('Already booked for this shift'),
    ).toBeInTheDocument();
  });

  it('shows upcoming approved shift in My Next Shift', async () => {
    jest.setSystemTime(
      toDayjs('2024-02-06T12:00', 'America/Regina').toDate(),
    );

    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        role_id: 1,
        date: formatReginaDate(
          toDayjs('2024-02-06T00:00', 'America/Regina'),
        ),
        start_time: '17:00:00',
        end_time: '18:00:00',
        role_name: 'Greeter',
      },
    ]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderDashboard();

    await waitFor(() => expect(getMyVolunteerBookings).toHaveBeenCalled());
    expect(await screen.findByText(/Greeter/)).toBeInTheDocument();
    expect(screen.queryByText(/No upcoming shifts/)).not.toBeInTheDocument();
  });

  it('displays earned badges', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getVolunteerStats as jest.Mock).mockResolvedValue(
      makeStats({ badges: ['early-bird'] }),
    );

    await renderDashboard();

    await waitFor(() => expect(getVolunteerStats).toHaveBeenCalled());
    expect(await screen.findByText('early-bird')).toBeInTheDocument();
  });

  it('shows volunteer stats in a single card', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getVolunteerStats as jest.Mock).mockResolvedValue({
      badges: [],
      lifetimeHours: 10,
      monthHours: 5,
      totalShifts: 3,
      currentStreak: 2,
      milestone: null,
      milestoneText: null,
      familiesServed: 0,
      poundsHandled: 0,
      monthFamiliesServed: 0,
      monthPoundsHandled: 0,
    });

    await renderDashboard();

    await waitFor(() => expect(getVolunteerStats).toHaveBeenCalled());
    expect(await screen.findByText('Lifetime Hours')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Hours This Month')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Total Shifts')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('2 weeks')).toBeInTheDocument();
  });

  it('shows leaderboard percentile in My Stats card', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getVolunteerLeaderboard as jest.Mock).mockResolvedValue({ rank: 3, percentile: 75 });

    await renderDashboard();

    const myStatsHeader = await screen.findByText('My Stats');
    const card = myStatsHeader.closest('.MuiCard-root');
    expect(card).not.toBeNull();
    expect(
      within(card as HTMLElement).getByText("You're in the top 75%!")
    ).toBeInTheDocument();
  });

  it('shows milestone banner when milestone is returned', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getVolunteerStats as jest.Mock).mockResolvedValue(
      makeStats({
        lifetimeHours: 10,
        monthHours: 5,
        totalShifts: 5,
        currentStreak: 1,
        milestone: 5,
        milestoneText: 'Congratulations on completing 5 shifts!',
      }),
    );
    (getVolunteerLeaderboard as jest.Mock).mockResolvedValue({ rank: 1, percentile: 100 });

    await renderDashboard();

    await waitFor(() => expect(getVolunteerStats).toHaveBeenCalled());
    const milestoneTitle = await screen.findByText('Milestone');
    const card = milestoneTitle.closest('.MuiCard-root') as HTMLElement;
    expect(within(card).getByText(/Congratulations on completing 5 shifts!/)).toBeInTheDocument();
  });

  it('shows appreciation message with monthly totals', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getVolunteerStats as jest.Mock).mockResolvedValue(
      makeStats({
        lifetimeHours: 10,
        monthHours: 5,
        totalShifts: 2,
        currentStreak: 1,
        familiesServed: 20,
        poundsHandled: 200,
        monthFamiliesServed: 3,
        monthPoundsHandled: 30,
      }),
    );
    (getVolunteerLeaderboard as jest.Mock).mockResolvedValue({ rank: 1, percentile: 100 });

    await renderDashboard();

    await waitFor(() => expect(getVolunteerStats).toHaveBeenCalled());
    expect(
      await screen.findByText(
        /This month you've helped serve 3 families and handle 30 lbs/,
      ),
    ).toBeInTheDocument();
  });

  it('shows group stats card with progress and quote', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderDashboard();

    await waitFor(() => expect(getVolunteerGroupStats).toHaveBeenCalled());
    expect(
      await screen.findByTestId('group-progress-gauge'),
    ).toBeInTheDocument();
  });

  it('displays year in date labels', async () => {
    jest.setSystemTime(
      toDayjs('2024-01-10T06:00', 'America/Regina').toDate(),
    );

    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        role_id: 1,
        date: formatReginaDate(
          toDayjs('2024-01-15T00:00', 'America/Regina'),
        ),
        start_time: '09:00:00',
        end_time: '12:00:00',
        role_name: 'Greeter',
      },
    ]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 2,
        role_id: 2,
        name: 'Cook',
        start_time: '13:00:00',
        end_time: '16:00:00',
        max_volunteers: 3,
        booked: 0,
        available: 3,
        status: 'available',
        date: formatReginaDate(
          toDayjs('2024-01-20T00:00', 'America/Regina'),
        ),
        category_id: 1,
        category_name: 'Kitchen',
        is_wednesday_slot: false,
      },
    ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderDashboard();

    const nextShift = await screen.findByText(/Greeter/);
    expect(nextShift).toHaveTextContent('2024');

    const slot = await screen.findByText(/Cook •/);
    expect(slot).toHaveTextContent('2024');
  });

  it('renders contribution trend and community gauge charts', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'completed',
        role_id: 1,
        date: formatReginaDate(
          toDayjs('2024-01-15T00:00', 'America/Regina'),
        ),
        start_time: '09:00:00',
        end_time: '12:00:00',
        role_name: 'Greeter',
      },
      {
        id: 2,
        status: 'completed',
        role_id: 1,
        date: formatReginaDate(
          toDayjs('2024-02-10T00:00', 'America/Regina'),
        ),
        start_time: '09:00:00',
        end_time: '12:00:00',
        role_name: 'Greeter',
      },
    ]);
    (getVolunteerGroupStats as jest.Mock).mockResolvedValue({
      totalHours: 20,
      monthHours: 5,
      monthHoursGoal: 10,
      totalLbs: 100,
      weekLbs: 25,
      monthLbs: 25,
      monthFamilies: 0,
    });
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderDashboard();

    await waitFor(() => expect(getVolunteerGroupStats).toHaveBeenCalled());
    await waitFor(() => expect(getMyVolunteerBookings).toHaveBeenCalled());
    expect(await screen.findByTestId('contribution-chart')).toBeInTheDocument();
    expect(await screen.findByTestId('group-progress-gauge')).toBeInTheDocument();
  });
});
