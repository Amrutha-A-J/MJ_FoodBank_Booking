import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

let queryClient: QueryClient;

async function renderClientDashboard() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ClientDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  await screen.findByText(/next available slots/i);
}

describe('ClientDashboard', () => {

  beforeEach(() => {
    localStorage.setItem('clientOnboarding', 'true');
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
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

    expect(getEvents).toHaveBeenCalled();
    expect(await screen.findByText(/Client Event/)).toBeInTheDocument();
  });

  it('shows upcoming holidays within 30 days', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-01T12:00:00Z'));
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([
      { date: '2024-05-10', reason: '' },
      { date: '2024-05-31', reason: 'Inventory Count' },
      { date: '2024-06-02', reason: 'Community BBQ' },
    ]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderClientDashboard();

    await waitFor(() => expect(getHolidays).toHaveBeenCalled());
    const upcomingTitle = await screen.findByText('Upcoming Holidays');
    expect(upcomingTitle).toBeInTheDocument();
    const upcomingCard = upcomingTitle.closest('.MuiPaper-root') as HTMLElement | null;
    expect(upcomingCard).not.toBeNull();
    const card = upcomingCard as HTMLElement;
    expect(await within(card).findByText('May 10 (Fri) – Holiday')).toBeInTheDocument();
    expect(await within(card).findByText('May 31 (Fri) – Inventory Count')).toBeInTheDocument();
    expect(screen.queryByText('Jun 2 (Sun) – Community BBQ')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('hides upcoming holidays card when none are returned', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue({ today: [], upcoming: [], past: [] });

    await renderClientDashboard();

    await waitFor(() => expect(getHolidays).toHaveBeenCalled());
    expect(screen.queryByText('Upcoming Holidays')).not.toBeInTheDocument();
  });

  it('handles undefined events response', async () => {
    (getBookingHistory as jest.Mock).mockResolvedValue([]);
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getEvents as jest.Mock).mockResolvedValue(undefined);

    await renderClientDashboard();

    expect(getEvents).toHaveBeenCalled();
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

    expect(getBookingHistory).toHaveBeenCalled();
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

    expect(getBookingHistory).toHaveBeenCalled();
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

  it('closes cancel dialog when Keep booking is clicked', async () => {
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
    (cancelBooking as jest.Mock).mockResolvedValue(undefined);

    await renderClientDashboard();

    const upcomingTitle = await screen.findByText(/my upcoming appointment/i);
    const upcomingCard = upcomingTitle.closest('.MuiPaper-root');
    expect(upcomingCard).not.toBeNull();

    const cancelButton = within(upcomingCard as HTMLElement).getByRole('button', {
      name: /^cancel$/i,
    });
    fireEvent.click(cancelButton);

    const keepBookingButton = await screen.findByRole('button', { name: /keep booking/i });
    fireEvent.click(keepBookingButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /keep booking/i })).not.toBeInTheDocument();
    });

    expect(cancelBooking).not.toHaveBeenCalled();
  });
});
