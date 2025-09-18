import { render, screen } from '@testing-library/react';
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
  getVolunteerGroupStats: jest.fn().mockResolvedValue({
    averageHours: 0,
    coverage: [],
    filledShifts: 0,
    totalShifts: 0,
  }),
}));

jest.mock('../../../api/events', () => ({
  getEvents: jest.fn().mockResolvedValue({ today: [], upcoming: [], past: [] }),
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
    render(
      <LocalizationProvider dateAdapter={AdapterDayjs} dateLibInstance={dayjs}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MemoryRouter>
            <VolunteerDashboard />
          </MemoryRouter>
        </ThemeProvider>
      </LocalizationProvider>,
    );

    const link = await screen.findByRole('link', { name: /download volunteer card/i });
    expect(link).toHaveAttribute('href', '/card.pdf');
    expect(link).toHaveAttribute('download');
  });
});
