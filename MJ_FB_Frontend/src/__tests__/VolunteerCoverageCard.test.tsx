import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import VolunteerCoverageCard from '../components/dashboard/VolunteerCoverageCard';
import { getVolunteerRoles, getVolunteerBookingsByRole } from '../api/volunteers';

jest.mock('../api/volunteers', () => ({
  getVolunteerRoles: jest.fn(),
  getVolunteerBookingsByRole: jest.fn(),
}));

describe('VolunteerCoverageCard', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('counts bookings for today without timezone shift', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-15T12:00:00Z'));
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Greeter',
        category_name: 'Front',
        max_volunteers: 2,
        shifts: [{ id: 1, start_time: '08:00', end_time: '12:00' }],
      },
    ]);
    (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([
      { status: 'approved', date: '2024-01-15' },
      { status: 'approved', date: '2024-01-14' },
    ]);

    render(<VolunteerCoverageCard />);

    await screen.findByText('Greeter 8:00 AM–12:00 PM (Front)');
    expect(await screen.findByText('1/2')).toBeInTheDocument();
  });

  it('shows volunteers when a coverage entry is clicked', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Greeter',
        category_name: 'Front',
        max_volunteers: 2,
        shifts: [{ id: 1, start_time: '08:00', end_time: '12:00' }],
      },
    ]);
    (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([
      { status: 'approved', date: '2024-01-15', volunteer_name: 'Alice' },
      { status: 'approved', date: '2024-01-15', volunteer_name: 'Bob' },
    ]);

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VolunteerCoverageCard />);

    await screen.findByText('Greeter 8:00 AM–12:00 PM (Front)');

    await user.click(screen.getByText('Greeter 8:00 AM–12:00 PM (Front)'));

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(
      await screen.findByText('Volunteers – Greeter 8:00 AM–12:00 PM'),
    ).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('counts completed bookings as filled coverage and lists volunteers', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Greeter',
        category_name: 'Front',
        max_volunteers: 2,
        shifts: [{ id: 1, start_time: '08:00', end_time: '12:00' }],
      },
    ]);
    (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([
      { status: 'approved', date: '2024-01-15', volunteer_name: 'Alice' },
      { status: 'completed', date: '2024-01-15', volunteer_name: 'Bob' },
    ]);

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<VolunteerCoverageCard />);

    await screen.findByText('Greeter 8:00 AM–12:00 PM (Front)');
    expect(await screen.findByText('2/2')).toBeInTheDocument();

    await user.click(screen.getByText('Greeter 8:00 AM–12:00 PM (Front)'));

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows coverage per shift', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-15T12:00:00Z'));
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Greeter',
        category_name: 'Front',
        max_volunteers: 2,
        shifts: [
          { id: 1, start_time: '08:00', end_time: '10:00' },
          { id: 2, start_time: '10:00', end_time: '12:00' },
        ],
      },
    ]);
    (getVolunteerBookingsByRole as jest.Mock)
      .mockResolvedValueOnce([{ status: 'approved', date: '2024-01-15' }])
      .mockResolvedValueOnce([
        { status: 'approved', date: '2024-01-15' },
        { status: 'approved', date: '2024-01-15' },
      ]);

    render(<VolunteerCoverageCard />);

    await screen.findByText('Greeter 8:00 AM–10:00 AM (Front)');
    expect(
      screen.getByText('Greeter 8:00 AM–10:00 AM (Front)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Greeter 10:00 AM–12:00 PM (Front)'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('1/2')).toHaveLength(1);
    expect(screen.getAllByText('2/2')).toHaveLength(1);
  });

  it('orders morning coverage before afternoon before 11:00 Regina time', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-15T16:59:00Z'));
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Greeter',
        category_name: 'Front',
        max_volunteers: 2,
        shifts: [
          { id: 1, start_time: '08:00', end_time: '10:00' },
          { id: 2, start_time: '13:00', end_time: '15:00' },
        ],
      },
    ]);
    (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([]);

    let loaded: unknown[] = [];
    render(<VolunteerCoverageCard onCoverageLoaded={data => (loaded = data)} />);

    await waitFor(() => expect(loaded).toHaveLength(2));

    const morningHeader = await screen.findByTestId('coverage-group-morning');
    const afternoonHeader = await screen.findByTestId('coverage-group-afternoon');
    const list = morningHeader.closest('ul');
    const children = Array.from(list?.children ?? []);

    expect(children.indexOf(morningHeader)).toBeLessThan(children.indexOf(afternoonHeader));
  });

  it('orders afternoon coverage before morning after 11:00 Regina time', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-15T17:01:00Z'));
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Greeter',
        category_name: 'Front',
        max_volunteers: 2,
        shifts: [
          { id: 1, start_time: '08:00', end_time: '10:00' },
          { id: 2, start_time: '13:00', end_time: '15:00' },
        ],
      },
    ]);
    (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([]);

    let loaded: unknown[] = [];
    render(<VolunteerCoverageCard onCoverageLoaded={data => (loaded = data)} />);

    await waitFor(() => expect(loaded).toHaveLength(2));

    const afternoonHeader = await screen.findByTestId('coverage-group-afternoon');
    const morningHeader = await screen.findByTestId('coverage-group-morning');
    const list = afternoonHeader.closest('ul');
    const children = Array.from(list?.children ?? []);

    expect(children.indexOf(afternoonHeader)).toBeLessThan(children.indexOf(morningHeader));
  });
});

