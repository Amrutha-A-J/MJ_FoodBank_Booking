import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VolunteerDashboard from '../pages/volunteer-management/VolunteerDashboard';
import {
  getMyVolunteerBookings,
  getVolunteerRolesForVolunteer,
  requestVolunteerBooking,
  updateVolunteerBookingStatus,
} from '../api/volunteers';
import { getEvents } from '../api/events';

jest.mock('../api/volunteers', () => ({
  getMyVolunteerBookings: jest.fn(),
  getVolunteerRolesForVolunteer: jest.fn(),
  requestVolunteerBooking: jest.fn(),
  updateVolunteerBookingStatus: jest.fn(),
}));

jest.mock('../api/events', () => ({ getEvents: jest.fn() }));

describe('VolunteerDashboard', () => {
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

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getEvents).toHaveBeenCalled());
    expect(screen.getByText(/Volunteer Event/)).toBeInTheDocument();
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
});
