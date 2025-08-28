import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PantrySchedule from '../pages/staff/PantrySchedule';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme';

jest.mock('../api/bookings', () => ({
  getSlots: jest.fn(),
  getBookings: jest.fn(),
  getHolidays: jest.fn(),
  createBookingForUser: jest.fn(),
  cancelBooking: jest.fn(),
}));

const { getSlots, getBookings, getHolidays } = jest.requireMock('../api/bookings');

function hexToRgb(hex: string) {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

describe('PantrySchedule status colors', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T10:00:00'));
    window.matchMedia = window.matchMedia || ((() => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    })) as any);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders cells with colors for each status', async () => {
    (getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '10:00:00', maxCapacity: 3 },
    ]);
    (getBookings as jest.Mock).mockResolvedValue([
      { id: 1, status: 'approved', date: '2024-01-01', slot_id: 1, user_name: 'App', user_id: 1, client_id: 1, bookings_this_month: 0, is_staff_booking: false, reschedule_token: '' },
      { id: 2, status: 'no_show', date: '2024-01-01', slot_id: 1, user_name: 'No', user_id: 2, client_id: 2, bookings_this_month: 0, is_staff_booking: false, reschedule_token: '' },
      { id: 3, status: 'visited', date: '2024-01-01', slot_id: 1, user_name: 'Vis', user_id: 3, client_id: 3, bookings_this_month: 0, is_staff_booking: false, reschedule_token: '' },
      ]);
    (getHolidays as jest.Mock).mockResolvedValue([]);

    const queryClient = new QueryClient();
    render(
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <PantrySchedule />
        </QueryClientProvider>
      </ThemeProvider>
    );

    const approved = await screen.findByText('App (1)');
    const noShow = screen.getByText('No (2)');
    const visited = screen.getByText('Vis (3)');

    const slots = screen.getAllByText(/Slot \d/);
    expect(slots).toHaveLength(3);

    expect(getComputedStyle(approved).backgroundColor).toBe('rgb(228, 241, 228)');
    expect(getComputedStyle(noShow).backgroundColor).toBe('rgb(255, 200, 200)');
    expect(getComputedStyle(visited).backgroundColor).toBe('rgb(111, 146, 113)');
  });
});

