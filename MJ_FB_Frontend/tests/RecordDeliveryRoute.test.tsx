import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { useAuth } from '../src/hooks/useAuth';
import useMaintenance from '../src/hooks/useMaintenance';
import { getDeliveryCategories } from '../src/api/deliveryCategories';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children?: ReactNode }) => (
      <actual.MemoryRouter initialEntries={["/pantry/deliveries/record"]}>
        {children}
      </actual.MemoryRouter>
    ),
  };
});

jest.mock('../src/hooks/useAuth', () => ({
  useAuth: jest.fn(),
  DonorManagementGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('../src/hooks/useMaintenance', () => jest.fn());

jest.mock('../src/components/InstallAppButton', () => () => null);

jest.mock('../src/api/deliveryCategories', () => ({
  getDeliveryCategories: jest.fn(),
}));

jest.mock('../src/api/deliveryOrders', () => {
  const actual = jest.requireActual('../src/api/deliveryOrders');
  return {
    ...actual,
    createDeliveryOrder: jest.fn(),
  };
});

describe('Record Delivery route', () => {
  const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockedUseMaintenance = useMaintenance as jest.MockedFunction<typeof useMaintenance>;
  const mockedGetDeliveryCategories = getDeliveryCategories as jest.MockedFunction<
    typeof getDeliveryCategories
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      role: 'staff',
      name: 'Test Staff',
      userRole: 'staff',
      access: ['pantry'],
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
    } as any);
    mockedUseMaintenance.mockReturnValue({ maintenanceMode: false, notice: undefined });
    mockedGetDeliveryCategories.mockResolvedValue([]);
  });

  it('renders the record delivery screen for staff users', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: /record delivery/i })).toBeInTheDocument();
  });
});
