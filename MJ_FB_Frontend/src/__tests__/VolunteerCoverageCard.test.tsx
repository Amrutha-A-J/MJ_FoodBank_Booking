import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
      { id: 1, name: 'Greeter', category_name: 'Front', max_volunteers: 2 },
    ]);
    (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([
      { status: 'approved', date: '2024-01-15' },
      { status: 'approved', date: '2024-01-14' },
    ]);

    render(<VolunteerCoverageCard />);

    await waitFor(() => expect(getVolunteerBookingsByRole).toHaveBeenCalled());
    expect(await screen.findByText('1/2')).toBeInTheDocument();
  });

  it('shows volunteers when a coverage entry is clicked', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-15T12:00:00Z'));
    (getVolunteerRoles as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Greeter', category_name: 'Front', max_volunteers: 2 },
    ]);
    (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([
      { status: 'approved', date: '2024-01-15', volunteer_name: 'Alice' },
      { status: 'approved', date: '2024-01-15', volunteer_name: 'Bob' },
    ]);

    render(<VolunteerCoverageCard />);

    await waitFor(() => expect(getVolunteerBookingsByRole).toHaveBeenCalled());

    await userEvent.click(screen.getByText('Greeter (Front)'));

    expect(await screen.findByText('Volunteers – Greeter')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});

