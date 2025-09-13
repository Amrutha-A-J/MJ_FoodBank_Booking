import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PantrySchedule from '../../staff/PantrySchedule';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../api/bookings', () => ({
  getSlots: jest.fn(),
  getBookings: jest.fn(),
  getHolidays: jest.fn(),
  createBookingForUser: jest.fn(),
  cancelBooking: jest.fn(),
}));
jest.mock('../../../api/users', () => ({
  searchUsers: jest.fn(),
}));
jest.mock('../../../components/ManageBookingDialog', () => () => null);
jest.mock('../../../components/RescheduleDialog', () => () => null);

const { getSlots, getBookings, getHolidays } = jest.requireMock('../../../api/bookings');

const originalMatchMedia = window.matchMedia;

function hexToRgb(color: string) {
  if (color.startsWith('rgb')) return color;
  const sanitized = color.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

function tint(color: string, ratios: [number, number, number]) {
  const [r, g, b] = hexToRgb(color)
    .replace(/rgb\(|\)/g, '')
    .split(',')
    .map((n) => parseInt(n.trim(), 10));
  const [rr, gg, bb] = ratios;
  const nr = Math.round(r + (255 - r) * rr);
  const ng = Math.round(g + (255 - g) * gg);
  const nb = Math.round(b + (255 - b) * bb);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

describe('PantrySchedule status colors', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T10:00:00'));
    window.matchMedia =
      window.matchMedia ||
      ((() => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as any);
  });

  afterAll(() => {
    jest.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('renders cells with colors for each status', async () => {
    (getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '10:00:00', maxCapacity: 3 },
    ]);
    (getBookings as jest.Mock).mockResolvedValue([
      { id: 1, status: 'approved', date: '2024-01-01', slot_id: 1, user_name: 'App', user_id: 1, client_id: 1, visits_this_month: 0, approved_bookings_this_month: 1, is_staff_booking: false, reschedule_token: '' },
      { id: 2, status: 'no_show', date: '2024-01-01', slot_id: 1, user_name: 'No', user_id: 2, client_id: 2, visits_this_month: 0, approved_bookings_this_month: 0, is_staff_booking: false, reschedule_token: '' },
      { id: 3, status: 'visited', date: '2024-01-01', slot_id: 1, user_name: 'Vis', user_id: 3, client_id: 3, visits_this_month: 0, approved_bookings_this_month: 0, is_staff_booking: false, reschedule_token: '' },
      ]);
    (getHolidays as jest.Mock).mockResolvedValue([]);

    const queryClient = new QueryClient();
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <QueryClientProvider client={queryClient}>
            <PantrySchedule />
          </QueryClientProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const approved = await screen.findByText('App (1)');
    const noShow = screen.getByText('No (2)');
    const visited = screen.getByText('Vis (3)');

    const slots = screen.getAllByText(/Slot \d/);
    expect(slots).toHaveLength(3);

    const approvedCell = approved.closest('td') as HTMLElement;
    const noShowCell = noShow.closest('td') as HTMLElement;
    const visitedCell = visited.closest('td') as HTMLElement;

    const approvedColor = tint(theme.palette.success.light, [
      0.8393,
      0.8654,
      0.835,
    ]);
    const noShowColor = tint(theme.palette.error.light, [1, 0.7027, 0.7027]);
    const visitedColor = tint(theme.palette.success.main, [
      0.311,
      0.1615,
      0.3073,
    ]);

    expect(getComputedStyle(approvedCell).backgroundColor).toBe(
      approvedColor,
    );
    expect(getComputedStyle(noShowCell).backgroundColor).toBe(
      noShowColor,
    );
    expect(getComputedStyle(visitedCell).backgroundColor).toBe(
      visitedColor,
    );
  });

  it('shows warning styling when capacity is exceeded', async () => {
    (getSlots as jest.Mock).mockResolvedValue([
      { id: '1', startTime: '09:00:00', endTime: '10:00:00', maxCapacity: 1 },
    ]);
    (getBookings as jest.Mock).mockResolvedValue([
      {
        id: 1,
        status: 'approved',
        date: '2024-01-01',
        slot_id: 1,
        user_name: 'App',
        user_id: 1,
        client_id: 1,
        visits_this_month: 0,
        approved_bookings_this_month: 1,
        is_staff_booking: false,
        reschedule_token: '',
      },
      {
        id: 2,
        status: 'approved',
        date: '2024-01-01',
        slot_id: 1,
        user_name: 'Over',
        user_id: 2,
        client_id: 2,
        visits_this_month: 0,
        approved_bookings_this_month: 2,
        is_staff_booking: false,
        reschedule_token: '',
      },
    ]);
    (getHolidays as jest.Mock).mockResolvedValue([]);

    const queryClient = new QueryClient();
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <QueryClientProvider client={queryClient}>
            <PantrySchedule />
          </QueryClientProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const over = await screen.findByText('Over (2)');
    const cell = over.closest('td') as HTMLElement;
    expect(getComputedStyle(cell).backgroundColor).toBe(
      hexToRgb(theme.palette.warning.light),
    );
    fireEvent.mouseOver(over);
    expect(await screen.findByText(/capacity exceeded/i)).toBeInTheDocument();
  });
});

