import { render, screen } from '@testing-library/react';
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
});

