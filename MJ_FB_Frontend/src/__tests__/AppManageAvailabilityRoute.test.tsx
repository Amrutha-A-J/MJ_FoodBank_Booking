import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import App from '../App';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import useMaintenance from '../hooks/useMaintenance';
import { useAuth } from '../hooks/useAuth';

type RecordedRoute = { path?: string };
const recordedRoutes: RecordedRoute[] = [];
let mockPathname = '/';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  BrowserRouter: ({ children }: { children: ReactNode }) => <>{children}</>,
  Routes: ({ children }: { children: ReactNode }) => <>{children}</>,
  Route: ({ path, element }: { path?: string; element?: ReactNode }) => {
    recordedRoutes.push({ path, element });
    return null;
  },
  Navigate: () => null,
  useLocation: () => ({ pathname: mockPathname }),
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
  NavLink: ({ children }: { children: ReactNode }) => <>{children}</>,
  __setMockPath: (path: string) => {
    mockPathname = path;
  },
  __getRecordedRoutes: () => recordedRoutes,
}));

jest.mock('../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  DonorManagementGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('../components/FeedbackSnackbar', () => () => null);

jest.mock('../hooks/useMaintenance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../pages/staff/ManageAvailability', () => {
  const mod = {
    __esModule: true,
    default: () => <div>ManageAvailabilityPage</div>,
  };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});

const { __setMockPath, __getRecordedRoutes } = jest.requireMock('react-router-dom') as {
  __setMockPath: (path: string) => void;
  __getRecordedRoutes: () => RecordedRoute[];
};

const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;
const useMaintenanceMock = useMaintenance as jest.MockedFunction<typeof useMaintenance>;

async function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  await act(async () => {
    render(<App />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('Manage availability route access', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = mockFetch();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });

    const routes = __getRecordedRoutes();
    routes.length = 0;
    __setMockPath('/');

    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      role: 'staff',
      name: 'Test Staff',
      userRole: '',
      access: [],
      id: null,
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
    });

    useMaintenanceMock.mockReturnValue({
      maintenanceMode: false,
      notice: undefined,
      isLoading: false,
    });
  });

  afterEach(() => {
    restoreFetch();
    jest.clearAllMocks();
  });

  it('renders manage availability for staff without pantry access', async () => {
    __setMockPath('/pantry/manage-availability');
    await renderAppAt('/pantry/manage-availability');

    const routes = __getRecordedRoutes();
    expect(routes.some(route => route.path === '/pantry/manage-availability')).toBe(true);
  });
});
