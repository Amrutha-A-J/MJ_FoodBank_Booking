import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
  type VolunteerStats,
} from '../api/volunteers';
import { getEvents } from '../api/events';

jest.mock('../api/volunteers', () => ({
  getMyVolunteerBookings: jest.fn(),
  getVolunteerRolesForVolunteer: jest.fn(),
  requestVolunteerBooking: jest.fn(),
  updateVolunteerBookingStatus: jest.fn(),
  getVolunteerStats: jest.fn(),
  getVolunteerLeaderboard: jest.fn(),
  getVolunteerGroupStats: jest.fn(),
}));

jest.mock('../api/events', () => ({ getEvents: jest.fn() }));

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

describe('VolunteerDashboard', () => {
beforeEach(() => {
  (getVolunteerLeaderboard as jest.Mock).mockResolvedValue({ rank: 1, percentile: 100 });
  (getVolunteerGroupStats as jest.Mock).mockResolvedValue({
    totalHours: 0,
    monthHours: 0,
    monthHoursGoal: 0,
    totalLbs: 0,
    weekLbs: 0,
  });
  localStorage.clear();
});
  it('shows events in News & Events section', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Volunteer Event',
          date: new Date().toISOString(),
          createdBy: 1,
          createdByName: 'Staff',
        },
      ],
      upcoming: [],
      past: [],
    });
    (getVolunteerStats as jest.Mock).mockResolvedValue(makeStats());

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getEvents).toHaveBeenCalled());
    expect(await screen.findByText(/Volunteer Event/)).toBeInTheDocument();
  });

  it('hides slots already booked by volunteer', async () => {
    const today = new Date().toISOString().split('T')[0];
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
    (getVolunteerStats as jest.Mock).mockResolvedValue(makeStats());

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('No available shifts'),
    ).toBeInTheDocument();
  });

  it('excludes past shifts from available slots', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-29T19:00:00Z'));

    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([
      {
        id: 1,
        role_id: 1,
        name: 'Greeter',
        start_time: '9:00:00',
        end_time: '12:00:00',
        max_volunteers: 3,
        booked: 0,
        available: 3,
        status: 'available',
        date: '2024-01-29',
        category_id: 1,
        category_name: 'Front',
        is_wednesday_slot: false,
      },
    ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No available shifts')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('shows server error when shift request fails', async () => {
    const today = new Date().toISOString().split('T')[0];
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
    (getVolunteerStats as jest.Mock).mockResolvedValue(makeStats());

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    const requestButton = await screen.findByRole('button', { name: /^Request$/ });
    fireEvent.click(requestButton);

    await waitFor(() => expect(requestVolunteerBooking).toHaveBeenCalled());
    expect(
      await screen.findByText('Already booked for this shift'),
    ).toBeInTheDocument();
  });

  it('shows upcoming approved shift in My Next Shift', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-02-06T18:00:00Z'));

    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        role_id: 1,
        date: '2024-02-06',
        start_time: '17:00:00',
        end_time: '18:00:00',
        role_name: 'Greeter',
      },
    ]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getVolunteerStats as jest.Mock).mockResolvedValue(makeStats());

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getMyVolunteerBookings).toHaveBeenCalled());
    expect(await screen.findByText(/Greeter/)).toBeInTheDocument();
    expect(screen.queryByText(/No upcoming shifts/)).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  it('displays earned badges', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getVolunteerStats as jest.Mock).mockResolvedValue(
      makeStats({ badges: ['early-bird'] }),
    );

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('early-bird')).toBeInTheDocument();
  });

  it('shows leaderboard percentile', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getVolunteerStats as jest.Mock).mockResolvedValue(makeStats());
    (getVolunteerLeaderboard as jest.Mock).mockResolvedValue({ rank: 3, percentile: 75 });

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("You're in the top 75%!")
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

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Congratulations on completing 5 shifts!/),
    ).toBeInTheDocument();
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

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

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
    (getVolunteerStats as jest.Mock).mockResolvedValue(makeStats());
    (getVolunteerGroupStats as jest.Mock).mockResolvedValue({
      totalHours: 10,
      monthHours: 4,
      monthHoursGoal: 8,
      totalLbs: 100,
      weekLbs: 25,
    });
    const rand = jest.spyOn(Math, 'random').mockReturnValue(0);

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Volunteers distributed 25 lbs this week/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/4 \/ 8 hrs/),
    ).toBeInTheDocument();
    const gauge = screen.getByTestId('group-progress-gauge');
    expect(gauge.querySelector('svg')).toBeInTheDocument();
    expect(
      screen.getByText('Canned Food Drive exceeded goals!'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('We appreciate your dedication!'),
    ).toBeInTheDocument();
    rand.mockRestore();
  });

  it('renders contribution trend and community gauge charts', async () => {
    (getMyVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        role_id: 1,
        date: '2024-01-15',
        start_time: '09:00:00',
        end_time: '12:00:00',
        role_name: 'Greeter',
      },
      {
        id: 2,
        status: 'approved',
        role_id: 1,
        date: '2024-02-10',
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
    });
    (getVolunteerRolesForVolunteer as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getVolunteerStats as jest.Mock).mockResolvedValue(makeStats());

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText('My Contribution Trend')).toBeInTheDocument();
    const contribution = screen.getByTestId('contribution-chart');
    expect(contribution.querySelector('svg')).toBeInTheDocument();

    const gauge = await screen.findByTestId('group-progress-gauge');
    expect(gauge.querySelector('svg')).toBeInTheDocument();
  });
});
