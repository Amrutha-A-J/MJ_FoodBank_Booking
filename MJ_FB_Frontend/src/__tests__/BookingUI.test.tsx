import React from 'react';
import { render, screen, waitFor, act, fireEvent, within } from '@testing-library/react';
import BookingUI, { SlotRow } from '../pages/BookingUI';
import dayjs from 'dayjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@mui/x-date-pickers/DateCalendar', () => ({
  DateCalendar: () => <div />,
}));

jest.mock('../api/bookings', () => ({
  getSlots: jest.fn(),
  createBooking: jest.fn(),
  getHolidays: jest.fn(),
}));

jest.mock('../api/users', () => ({
  getUserProfile: jest.fn(),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ role: 'client', name: 'Test User', userRole: 'shopper' }),
}));

const { getSlots, getHolidays, createBooking } = jest.requireMock('../api/bookings');
const { getUserProfile } = jest.requireMock('../api/users');

describe('BookingUI visible slots', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T10:30:00'));
  });

  beforeEach(() => {
    jest.setSystemTime(new Date('2024-01-01T10:30:00'));
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.setSystemTime(new Date());
    jest.useRealTimers();
  });

  it('hides past slots when viewing today', async () => {
    (getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '09:30:00', available: 1 },
      { id: '2', startTime: '11:00:00', endTime: '11:30:00', available: 1 },
    ]);
    (getHolidays as jest.Mock).mockResolvedValue([]);

    const queryClient = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <BookingUI shopperName="Test" initialDate={dayjs('2024-01-01')} />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await act(async () => {
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => expect(getSlots).toHaveBeenCalled());
    expect(screen.queryByText(/9:00 am/i)).toBeNull();
  });

  it('skips past dates by advancing to today', async () => {
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);

    const queryClient = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <BookingUI shopperName="Test" initialDate={dayjs('2023-12-29')} />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await act(async () => {
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(getSlots).toHaveBeenCalledWith('2024-01-01');
    });
    expect(getSlots).toHaveBeenCalledTimes(1);
  });

  it('omits title when embedded', async () => {
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);

    const queryClient = new QueryClient();
    render(
      <MemoryRouter initialEntries={['/book-appointment']}>
        <QueryClientProvider client={queryClient}>
          <BookingUI shopperName="Test" embedded />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await act(async () => {
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });
    await screen.findByText(/Booking for Test/);
    expect(screen.queryByText('Book Shopping Appointment')).toBeNull();
  });

  it('shows an empty state when no slots are available', async () => {
    (getSlots as jest.Mock).mockResolvedValue([]);
    (getHolidays as jest.Mock).mockResolvedValue([]);

    const queryClient = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <BookingUI shopperName="Test" initialDate={dayjs('2024-01-02')} />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await act(async () => {
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(getSlots).toHaveBeenCalled());
    expect(await screen.findByText(/no slots available/i)).toBeInTheDocument();
  });
});

describe('SlotRow', () => {
  it('shrinks when selected and shows booking button', () => {
    const slot = {
      id: '1',
      startTime: '11:00:00',
      endTime: '11:30:00',
      available: 1,
    } as any;
    const { rerender } = render(
      <SlotRow
        slot={slot}
        selected={false}
        onSelect={() => {}}
        onBook={() => {}}
        booking={false}
        loadingConfirm={false}
      />,
    );
    const listButton = screen.getByLabelText(/select time slot from/i);
    expect(listButton).toHaveStyle({ marginBottom: '0px' });
    expect(
      screen.queryByRole('button', { name: /book selected slot/i }),
    ).toBeNull();
    rerender(
      <SlotRow
        slot={slot}
        selected={true}
        onSelect={() => {}}
        onBook={() => {}}
        booking={false}
        loadingConfirm={false}
      />,
    );
    expect(
      screen.getByRole('button', { name: /book selected slot/i }),
    ).toBeInTheDocument();
    expect(listButton).toHaveStyle({ marginBottom: '8px' });
  });
});

describe('Booking confirmation', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-31T10:30:00'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2023-12-31T10:30:00'));
  });

  afterAll(() => {
    jest.setSystemTime(new Date());
    jest.useRealTimers();
  });

  async function renderUI(
    slots = [
      { id: '1', startTime: '11:00:00', endTime: '11:30:00', available: 1 },
    ],
  ) {
    (getSlots as jest.Mock).mockResolvedValue(slots);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    const queryClient = new QueryClient();
    render(
      <MemoryRouter initialEntries={['/book-appointment']}>
        <QueryClientProvider client={queryClient}>
          <BookingUI shopperName="Test" initialDate={dayjs().add(1, 'day')} />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    await act(async () => {
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });
  }

  it('opens confirmation dialog before booking', async () => {
    (getUserProfile as jest.Mock).mockResolvedValue({ bookingsThisMonth: 0 });

    await renderUI();
    await waitFor(() => expect(getSlots).toHaveBeenCalled());
    const slot = await screen.findByLabelText(/select time slot from/i);
    fireEvent.click(slot);
    const bookButton = within(slot.closest('li')!).getByRole('button', {
      name: /book selected slot/i,
    });
    fireEvent.click(bookButton);

    await waitFor(() => expect(getUserProfile).toHaveBeenCalled());
    await screen.findByText(/confirm booking/i);
  });

  it('submits note with booking', async () => {
    (getUserProfile as jest.Mock).mockResolvedValue({ bookingsThisMonth: 0 });
    (createBooking as jest.Mock).mockResolvedValue({});

    await renderUI();
    await waitFor(() => expect(getSlots).toHaveBeenCalled());
    const slot = await screen.findByLabelText(/select time slot from/i);
    fireEvent.click(slot);
    const bookButton = within(slot.closest('li')!).getByRole('button', {
      name: /book selected slot/i,
    });
    fireEvent.click(bookButton);

    await waitFor(() => expect(getUserProfile).toHaveBeenCalled());
    await screen.findByText(/confirm booking/i);
    fireEvent.change(screen.getByLabelText(/client note/i), {
      target: { value: 'bring ID' },
    });
    fireEvent.click(screen.getByText(/confirm$/i));

    await waitFor(() =>
      expect(createBooking).toHaveBeenCalledWith(
        '1',
        '2024-01-01',
        'bring ID',
        undefined,
      ),
    );
  });

  it('shows summary fields on separate lines', async () => {
    (getUserProfile as jest.Mock).mockResolvedValue({ bookingsThisMonth: 3 });

    await renderUI();
    await waitFor(() => expect(getSlots).toHaveBeenCalled());
    const slot = await screen.findByLabelText(/select time slot from/i);
    fireEvent.click(slot);
    const bookButton = within(slot.closest('li')!).getByRole('button', {
      name: /book selected slot/i,
    });
    fireEvent.click(bookButton);

    await waitFor(() => expect(getUserProfile).toHaveBeenCalled());
    await screen.findByText(/confirm booking/i);
    await screen.findByText(/^Date:/i);
    await screen.findByText(/^Time:/i);
    await screen.findByText(/^Visits this month:/i);
  });

  it('shows calendar links after booking', async () => {
    (getUserProfile as jest.Mock).mockResolvedValue({ bookingsThisMonth: 0 });
    (createBooking as jest.Mock).mockResolvedValue({
      googleCalendarUrl: 'https://calendar.test',
      icsUrl: '/test.ics',
    });

    await renderUI();
    await waitFor(() => expect(getSlots).toHaveBeenCalled());
    const slot = await screen.findByLabelText(/select time slot from/i);
    fireEvent.click(slot);
    const bookButton = within(slot.closest('li')!).getByRole('button', {
      name: /book selected slot/i,
    });
    fireEvent.click(bookButton);

    await waitFor(() => expect(getUserProfile).toHaveBeenCalled());
    await screen.findByText(/confirm booking/i);
    fireEvent.click(screen.getByText(/confirm$/i));

    await waitFor(() => expect(createBooking).toHaveBeenCalled());
    const gcal = await screen.findByRole('link', { name: /add to google calendar/i });
    expect(gcal).toHaveAttribute('href', 'https://calendar.test');
    const ics = screen.getByRole('link', { name: /add to apple calendar/i });
    expect(ics).toHaveAttribute('href', '/test.ics');
  });
});
