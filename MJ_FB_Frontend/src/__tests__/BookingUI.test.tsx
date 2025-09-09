import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import BookingUI from '../pages/BookingUI';
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

const { getSlots, getHolidays, createBooking } = jest.requireMock('../api/bookings');
const { getUserProfile } = jest.requireMock('../api/users');

beforeEach(() => {
  const esInstance: any = { close: jest.fn() };
  const esConstructor = jest.fn(() => esInstance);
  // @ts-expect-error mock EventSource
  global.EventSource = esConstructor;
});

afterEach(() => {
  // @ts-expect-error cleanup
  delete global.EventSource;
});

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
    jest.useRealTimers();
    jest.useFakeTimers();
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
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <BookingUI shopperName="Test" embedded />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    await act(async () => {
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });
    await screen.findByText(/Booking for: Test/);
    expect(screen.queryByText('Book Appointment')).toBeNull();
  });
});

describe('Booking confirmation', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T10:30:00'));
  });

  beforeEach(() => {
    jest.setSystemTime(new Date('2024-01-01T10:30:00'));
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function renderUI() {
    const queryClient = new QueryClient();
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <BookingUI shopperName="Test" initialDate={dayjs('2024-01-01')} />
        </QueryClientProvider>
      </MemoryRouter>,
    );
  }

  it.skip('opens confirmation dialog before booking', async () => {
    (getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '11:00:00', endTime: '11:30:00', available: 1 },
    ]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getUserProfile as jest.Mock).mockResolvedValue({ bookingsThisMonth: 0 });

    renderUI();

    await act(async () => {
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => expect(getSlots).toHaveBeenCalled());
    const slot = await screen.findByLabelText(/select .* time slot/i);
    fireEvent.click(slot);
    fireEvent.click(screen.getByText(/book selected slot/i));

    await screen.findByText(/confirm booking/i);
  });

  it('submits note with booking', async () => {
    (getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '11:00:00', endTime: '11:30:00', available: 1 },
    ]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getUserProfile as jest.Mock).mockResolvedValue({ bookingsThisMonth: 0 });
    (createBooking as jest.Mock).mockResolvedValue({});

    renderUI();

    await act(async () => {
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => expect(getSlots).toHaveBeenCalled());
    const slot = await screen.findByLabelText(/select .* time slot/i);
    fireEvent.click(slot);
    fireEvent.click(screen.getByText(/book selected slot/i));

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
    (getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '11:00:00', endTime: '11:30:00', available: 1 },
    ]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getUserProfile as jest.Mock).mockResolvedValue({ bookingsThisMonth: 3 });

    renderUI();

    await act(async () => {
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => expect(getSlots).toHaveBeenCalled());
    const slot = await screen.findByLabelText(/select .* time slot/i);
    fireEvent.click(slot);
    fireEvent.click(screen.getByText(/book selected slot/i));

    await screen.findByText(/confirm booking/i);
    screen.getByText(/^Date:/i);
    screen.getByText(/^Time:/i);
    screen.getByText(/^Visits this month:/i);
  });

  it('shows calendar links after booking', async () => {
    (getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '11:00:00', endTime: '11:30:00', available: 1 },
    ]);
    (getHolidays as jest.Mock).mockResolvedValue([]);
    (getUserProfile as jest.Mock).mockResolvedValue({ bookingsThisMonth: 0 });
    (createBooking as jest.Mock).mockResolvedValue({
      googleCalendarUrl: 'https://calendar.test',
      icsUrl: '/test.ics',
    });

    renderUI();

    await act(async () => {
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => expect(getSlots).toHaveBeenCalled());
    const slot = await screen.findByLabelText(/select .* time slot/i);
    fireEvent.click(slot);
    fireEvent.click(screen.getByText(/book selected slot/i));

    await screen.findByText(/confirm booking/i);
    fireEvent.click(screen.getByText(/confirm$/i));

    await waitFor(() => expect(createBooking).toHaveBeenCalled());
    const gcal = await screen.findByRole('link', { name: /add to google calendar/i });
    expect(gcal).toHaveAttribute('href', 'https://calendar.test');
    const ics = screen.getByRole('link', { name: /add to apple calendar/i });
    expect(ics).toHaveAttribute('href', '/test.ics');
  });
});
