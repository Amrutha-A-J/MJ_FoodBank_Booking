import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientDashboard from '../pages/client/ClientDashboard';
import { getBookingHistory, getSlots, getHolidays, cancelBooking } from '../api/bookings';
import { getEvents } from '../api/events';

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn(),
  getSlots: jest.fn(),
  getHolidays: jest.fn(),
  cancelBooking: jest.fn(),
}));

jest.mock('../api/events', () => ({ getEvents: jest.fn() }));

describe('ClientDashboard', () => {
  it('shows events in News & Events section', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Client Event',
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
        <ClientDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getEvents).toHaveBeenCalled());
    expect(await screen.findByText(/Client Event/)).toBeInTheDocument();
  });

  it('displays visited bookings with success chip', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'visited',
        date: new Date().toISOString(),
      },
    ]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    render(
      <MemoryRouter>
        <ClientDashboard />
      </MemoryRouter>,
    );

    const chipLabel = await screen.findByText(/visited/i);
    expect(chipLabel.closest('.MuiChip-colorSuccess')).toBeTruthy();
  });

  it('hides client note in booking history', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        date: '2024-01-01',
        start_time: '09:00:00',
        client_note: 'bring bag',
      },
    ]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    render(
      <MemoryRouter>
        <ClientDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(screen.queryByText('bring bag')).not.toBeInTheDocument();
  });
});
