import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../components/dashboard/Dashboard';
import { getBookings, getSlotsRange } from '../api/bookings';
import { getEvents } from '../api/events';

jest.mock('../api/bookings', () => ({
  getBookings: jest.fn(),
  getSlotsRange: jest.fn(),
}));

jest.mock('../api/events', () => ({
  getEvents: jest.fn(),
}));

describe('StaffDashboard', () => {
  it('does not display no-show rankings card', async () => {
    (getBookings as jest.Mock).mockResolvedValue([]);
    (getSlotsRange as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    render(
      <MemoryRouter>
        <Dashboard role="staff" />
      </MemoryRouter>,
    );

    await screen.findByText('Today at a Glance');
    expect(screen.getByText('News & Events')).toBeInTheDocument();
    expect(screen.queryByText('No-Show Rankings')).toBeNull();
  });
});
