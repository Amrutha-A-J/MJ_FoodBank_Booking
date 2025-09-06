import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';
import { getBookings } from '../api/bookings';
import { getEvents } from '../api/events';
import { getVisitStats } from '../api/clientVisits';
import {
  getVolunteerBookings,
  getVolunteerRoles,
  getVolunteerBookingsByRole,
} from '../api/volunteers';

jest.mock('../api/bookings', () => ({
  getBookings: jest.fn(),
}));

jest.mock('../api/events', () => ({
  getEvents: jest.fn(),
}));

jest.mock('../api/clientVisits', () => ({
  getVisitStats: jest.fn(),
}));

jest.mock('../api/volunteers', () => ({
  getVolunteerBookings: jest.fn(),
  getVolunteerRoles: jest.fn(),
  getVolunteerBookingsByRole: jest.fn(),
}));

describe('StaffDashboard', () => {
  it('shows events returned by the API', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([]);
    (getVisitStats as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Staff Meeting',
          startDate: '2024-01-01',
          endDate: '2024-01-01',
          createdBy: 1,
          createdByName: 'Alice',
        },
      ],
      upcoming: [],
      past: [],
    });

    render(
      <MemoryRouter>
        <Dashboard role="staff" />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Staff Meeting/)).toBeInTheDocument();
  });

  it('displays volunteer shift cancellations', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'cancelled',
        role_id: 2,
        date: '2025-01-01',
        start_time: '09:00:00',
        end_time: '12:00:00',
        role_name: 'Test',
        volunteer_name: 'Bob',
      },
    ]);
    (getVolunteerRoles as jest.Mock).mockResolvedValue([]);
    (getVolunteerBookingsByRole as jest.Mock).mockResolvedValue([]);
    (getVisitStats as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    render(
      <MemoryRouter>
        <Dashboard role="staff" />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Recent Cancellations/)).toBeInTheDocument();
    expect(await screen.findByText(/Bob/)).toBeInTheDocument();
  });
});
