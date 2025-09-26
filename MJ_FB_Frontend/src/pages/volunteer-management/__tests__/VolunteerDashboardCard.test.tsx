import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from '../../../utils/date';
import { theme } from '../../../theme';
import VolunteerDashboard from '../VolunteerDashboard';
import { useAuth } from '../../../hooks/useAuth';

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../api/volunteers', () => ({
  getMyVolunteerBookings: jest.fn().mockResolvedValue([]),
  getVolunteerRolesForVolunteer: jest.fn().mockResolvedValue([]),
  requestVolunteerBooking: jest.fn().mockResolvedValue(undefined),
  updateVolunteerBookingStatus: jest.fn().mockResolvedValue(undefined),
  getVolunteerStats: jest.fn().mockResolvedValue({
    badges: [],
    totalShifts: 0,
    monthFamiliesServed: 0,
    monthPoundsHandled: 0,
    milestone: false,
    milestoneText: undefined,
    currentStreak: 0,
    lifetimeHours: 0,
    monthHours: 0,
  }),
  getVolunteerLeaderboard: jest.fn().mockResolvedValue(undefined),
  resolveVolunteerBookingConflict: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../api/events', () => ({
  getEvents: jest.fn().mockResolvedValue({ today: [], upcoming: [], past: [] }),
}));

jest.mock('../../../api/bookings', () => ({
  getHolidays: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../components/VolunteerBottomNav', () => () => null);
jest.mock('../../../components/OnboardingModal', () => () => null);

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('VolunteerDashboard card download affordance', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      role: 'volunteer',
      name: 'Test Volunteer',
      userRole: '',
      access: [],
      id: 1,
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '/card.pdf',
      ready: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a download link when cardUrl is provided', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <LocalizationProvider dateAdapter={AdapterDayjs} dateLibInstance={dayjs}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <MemoryRouter>
              <VolunteerDashboard />
            </MemoryRouter>
          </ThemeProvider>
        </LocalizationProvider>
      </QueryClientProvider>,
    );

    const link = await screen.findByRole('link', { name: /download volunteer card/i });
    expect(link).toHaveAttribute('href', '/card.pdf');
    expect(link).toHaveAttribute('download');

    queryClient.clear();
  });
});
