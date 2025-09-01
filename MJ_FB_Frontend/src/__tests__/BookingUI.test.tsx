import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
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

const { getSlots, getHolidays } = jest.requireMock('../api/bookings');

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
