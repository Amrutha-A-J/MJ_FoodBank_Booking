import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import App from '../src/App';
import { useAuth } from '../src/hooks/useAuth';
import useMaintenance from '../src/hooks/useMaintenance';

jest.mock('../src/hooks/useAuth', () => ({
  useAuth: jest.fn(),
  DonorManagementGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('../src/hooks/useMaintenance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../src/components/InstallAppButton', () => () => null);
jest.mock('../src/components/Navbar', () => () => <div />);
jest.mock('../src/components/layout/MainLayout', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    usePageTitle: jest.fn(),
    useBreadcrumbActions: jest.fn(),
  };
});
jest.mock('../src/components/MaintenanceBanner', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('../src/components/MaintenanceOverlay', () => () => null);
jest.mock('../src/components/FeedbackSnackbar', () => () => null);

describe('Pantry record delivery route', () => {
  const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockedUseMaintenance = useMaintenance as jest.MockedFunction<typeof useMaintenance>;

  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      role: 'staff',
      name: 'Pantry Staff',
      userRole: '',
      access: ['pantry'],
      id: 1,
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
      ready: true,
    } as unknown as ReturnType<typeof useAuth>);

    mockedUseMaintenance.mockReturnValue({
      maintenanceMode: false,
      notice: undefined,
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the record delivery page for pantry staff', async () => {
    window.history.pushState({}, '', '/pantry/deliveries/record');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /record delivery/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/search client by name or id/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to outstanding deliveries/i }),
    ).toBeInTheDocument();
  });
});
