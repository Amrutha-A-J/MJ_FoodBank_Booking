import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

    render(
      <MemoryRouter>
        <VolunteerDashboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('No available shifts'),
    ).toBeInTheDocument();
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
});
