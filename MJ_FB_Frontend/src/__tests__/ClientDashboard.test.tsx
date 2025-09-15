import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
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

async function renderClientDashboard() {
  await act(async () => {
    render(
      <MemoryRouter>
        <ClientDashboard />
      </MemoryRouter>,
    );
  });
  await waitFor(() => expect(getSlots).toHaveBeenCalledTimes(7));
}

describe('ClientDashboard', () => {
  beforeEach(() => {
    localStorage.setItem('clientOnboarding', 'true');
    jest.clearAllMocks();
  });
  it('shows events in News and Events section', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({
      today: [
        {
          id: 1,
          title: 'Client Event',
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

    await renderClientDashboard();

    await waitFor(() => expect(getEvents).toHaveBeenCalled());
    expect(await screen.findByText(/Client Event/)).toBeInTheDocument();
  });

  it('handles undefined events response', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue(undefined);

    await renderClientDashboard();

    await waitFor(() => expect(getEvents).toHaveBeenCalled());
    expect(await screen.findByText(/No events/i)).toBeInTheDocument();
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

    await renderClientDashboard();

    const chipLabel = await screen.findByText(/visited/i);
    expect(chipLabel.closest('.MuiChip-colorSuccess')).toBeTruthy();
  });

  it('displays visit dates without timezone shift', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-16T12:00:00Z'));
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'visited',
        date: '2024-01-15',
      },
    ]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderClientDashboard();

    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(await screen.findByText('Mon, Jan 15, 2024')).toBeInTheDocument();
    jest.useRealTimers();
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

    await renderClientDashboard();

    await waitFor(() => expect(getBookingHistory).toHaveBeenCalled());
    expect(screen.queryByText('bring bag')).not.toBeInTheDocument();
  });

  it('renders quick actions card first', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderClientDashboard();

    const quick = await screen.findByText(/quick actions/i);
    const news = await screen.findByText(/news and events/i);
    const next = await screen.findByText(/next available slots/i);

    expect(quick.compareDocumentPosition(news) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(quick.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('enables reschedule button when token is available', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        date: '2099-01-01',
        start_time: '09:00:00',
        reschedule_token: 'tok123',
      },
    ]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderClientDashboard();

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /reschedule/i });
      expect(buttons.some(btn => !btn.hasAttribute('disabled'))).toBe(true);
    });
  });

  it('cancels an upcoming booking from the dashboard', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T12:00:00Z'));
    (getBookingHistory as jest.Mock).mockResolvedValue([
      {
        id: 10,
        status: 'approved',
        date: '2024-01-05',
        start_time: '10:00:00',
      },
    ]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (cancelBooking as jest.Mock).mockResolvedValue(undefined);

    try {
      await renderClientDashboard();

      const appointment = await screen.findByText('Fri, Jan 5, 2024 10:00 AM', {
        selector: 'p',
      });
      const listItem = appointment.closest('li');
      expect(listItem).not.toBeNull();

      fireEvent.click(within(listItem!).getByRole('button', { name: /^cancel$/i }));

      const dialog = await screen.findByRole('dialog', { name: /cancel booking/i });
      fireEvent.click(within(dialog).getByRole('button', { name: /cancel booking/i }));

      await waitFor(() => {
        expect(cancelBooking).toHaveBeenCalledWith('10');
      });

      expect(await screen.findByText(/booking cancelled/i)).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('lists next available slots using API results', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-01T12:00:00Z'));
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });
    (getSlots as jest.Mock).mockImplementation(async (date: string) => {
      if (date === '2024-05-01') {
        return [
          { id: 'a', startTime: '09:00:00', endTime: '09:30:00', available: 1 },
        ];
      }
      if (date === '2024-05-02') {
        return [
          { id: 'b', startTime: '11:00:00', endTime: '11:30:00', available: 2 },
        ];
      }
      return [];
    });

    try {
      await renderClientDashboard();

      const firstSlot = await screen.findByText('Wed, May 1, 2024 9:00 AM-9:30 AM');
      const slotList = firstSlot.closest('ul');
      expect(slotList).not.toBeNull();

      expect(screen.getByText('Thu, May 2, 2024 11:00 AM-11:30 AM')).toBeInTheDocument();

      const bookButtons = within(slotList!).getAllByRole('button', { name: /^book$/i });
      expect(bookButtons).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
