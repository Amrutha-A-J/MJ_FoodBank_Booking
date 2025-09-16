import { screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from '../App';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import useMaintenance from '../hooks/useMaintenance';
import { DonorManagementGuard } from '../hooks/useAuth';

jest.mock('../hooks/useAuth', () => {
  const React = require('react');
  const { Navigate } = require('react-router-dom');

  const AuthContext = React.createContext(null);

  const AuthProvider = ({ children }) => {
    const [role, setRole] = React.useState(
      () => localStorage.getItem('role') || '',
    );
    const [name, setName] = React.useState(
      () => localStorage.getItem('name') || '',
    );
    const [access, setAccess] = React.useState(() => {
      const stored = localStorage.getItem('access');
      return stored ? JSON.parse(stored) : [];
    });

    const login = async user => {
      setRole(user.role);
      setName(user.name);
      setAccess(user.access || []);
      localStorage.setItem('role', user.role);
      localStorage.setItem('name', user.name);
      localStorage.setItem('access', JSON.stringify(user.access || []));
      return '/';
    };

    const logout = async () => {
      setRole('');
      setName('');
      setAccess([]);
      localStorage.clear();
    };

    const value = {
      isAuthenticated: !!role,
      role,
      name,
      userRole: '',
      access,
      id: null,
      login,
      logout,
      cardUrl: '',
      ready: true,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

  const useAuth = () => {
    const ctx = React.useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
  };

  const DonorManagementGuard = ({ children }) => {
    const { access } = useAuth();
    const allowed = access.includes('donor_management') || access.includes('admin');
    return allowed ? <>{children}</> : <Navigate to="/" replace />;
  };

  return {
    __esModule: true,
    AuthProvider,
    useAuth,
    DonorManagementGuard,
  };
});

jest.mock('../components/FeedbackSnackbar', () => () => null);
let fetchMock: jest.Mock;

jest.mock('../hooks/useMaintenance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useMaintenanceMock = useMaintenance as jest.MockedFunction<
  typeof useMaintenance
>;

async function flushAsyncOperations() {
  let iterations = 0;
  while (jest.getTimerCount() > 0 && iterations < 10) {
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      await Promise.resolve();
    });
    iterations += 1;
  }
  if (jest.getTimerCount() > 0) {
    jest.clearAllTimers();
  }
  await act(async () => {
    await Promise.resolve();
  });
}

async function renderApp(path?: string) {
  if (path) {
    window.history.pushState({}, '', path);
  }
  jest.useFakeTimers();
  try {
    await act(async () => {
      renderWithProviders(<App />);
      jest.runOnlyPendingTimers();
    });
    await flushAsyncOperations();
  } finally {
    jest.useRealTimers();
  }
}

jest.mock('../pages/volunteer-management/VolunteerManagement', () => {
  const mod = { __esModule: true, default: () => <div>VolunteerManagement</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});
jest.mock('../pages/volunteer-management/VolunteerTabs', () => {
  const mod = { __esModule: true, default: () => <div>VolunteerTabs</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});
jest.mock('../pages/warehouse-management/WarehouseDashboard', () => {
  const mod = { __esModule: true, default: () => <div>WarehouseDashboard</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});
jest.mock('../pages/warehouse-management/DonationLog', () => {
  const mod = { __esModule: true, default: () => <div>DonationLogPage</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});

jest.mock('../pages/donor-management/DonorDashboard', () => {
  const mod = { __esModule: true, default: () => <div>DonorDashboard</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});
  
jest.mock('../pages/donor-management/DonorProfile', () => {
  const mod = { __esModule: true, default: () => <div>DonorProfilePage</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});
jest.mock('../pages/donor-management/MailLists', () => {
  const mod = { __esModule: true, default: () => <div>MailLists</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn().mockResolvedValue([]),
  getSlots: jest.fn().mockResolvedValue([]),
  getHolidays: jest.fn().mockResolvedValue([]),
}));

describe('App authentication persistence', () => {
  beforeEach(() => {
    useMaintenanceMock.mockReturnValue({
      maintenanceMode: false,
      notice: undefined,
      isLoading: false,
    });
    fetchMock = mockFetch();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    jest.useRealTimers();
    restoreFetch();
    jest.resetAllMocks();
  });

  it('shows login when not authenticated', async () => {
    await renderApp();
    expect(
      await screen.findByRole('heading', { name: /login/i }),
    ).toBeInTheDocument();
  });

  it('allows access to privacy policy without login', async () => {
    await renderApp('/privacy');
    expect(
      await screen.findByRole('heading', { name: /privacy policy/i })
    ).toBeInTheDocument();
  });

  it('keeps user logged in when role exists', async () => {
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Test User');
    await renderApp();
    expect(screen.queryByText(/user login/i)).not.toBeInTheDocument();
  });

  it('shows set password even when already logged in', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    await renderApp('/set-password?token=abc');
    const els = await screen.findAllByText(/set password/i);
    expect(els.length).toBeGreaterThan(0);
  });

  describe('staff navigation', () => {
    const StaffRoutes = () => (
      <Routes>
        <Route
          path="/donor-management/donation-log"
          element={
            <DonorManagementGuard>
              <div>DonationLogPage</div>
            </DonorManagementGuard>
          }
        />
        <Route
          path="/donor-management"
          element={
            <DonorManagementGuard>
              <div>DonorDashboard</div>
            </DonorManagementGuard>
          }
        />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    );

    beforeEach(() => {
      localStorage.setItem('role', 'staff');
      localStorage.setItem('name', 'Test Staff');
    });

    it.each([
      {
        access: ['donor_management'],
        description: 'donor donation log page for donor management access',
        path: '/donor-management/donation-log',
        expected: 'DonationLogPage',
      },
      {
        access: ['donor_management'],
        description: 'donor management home for donor management access',
        path: '/donor-management',
        expected: 'DonorDashboard',
      },
      {
        access: ['admin'],
        description:
          'donor donation log page for admin without donor management access',
        path: '/donor-management/donation-log',
        expected: 'DonationLogPage',
      },
    ])('routes staff to the $description', async ({ access, path, expected }) => {
      localStorage.setItem('access', JSON.stringify(access));
      renderWithProviders(
        <MemoryRouter initialEntries={[path]}>
          <StaffRoutes />
        </MemoryRouter>,
      );
      await waitFor(() => {
        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    });

    it('redirects staff without donor_management access away from donor pages', async () => {
      localStorage.setItem('access', JSON.stringify(['pantry']));
      renderWithProviders(
        <MemoryRouter initialEntries={['/donor-management/donation-log']}>
          <StaffRoutes />
        </MemoryRouter>,
      );
      await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument());
      expect(screen.queryByText('DonationLogPage')).not.toBeInTheDocument();
    });
  });
});
