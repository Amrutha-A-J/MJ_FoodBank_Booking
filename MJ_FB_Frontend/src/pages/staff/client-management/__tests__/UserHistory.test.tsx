import {
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
} from '../../../../../testUtils/renderWithProviders';
import { MemoryRouter } from 'react-router-dom';
import UserHistory from '../UserHistory';
import { getDeliveryOrdersForClient } from '../../../../api/deliveryOrders';
import { getUserByClientId } from '../../../../api/users';

jest.mock('../../../../components/ClientBottomNav', () => ({
  __esModule: true,
  default: () => <div data-testid="client-nav" />,
}));

jest.mock('../../../../components/VolunteerBottomNav', () => ({
  __esModule: true,
  default: () => <div data-testid="volunteer-nav" />,
}));

type MockedGetOrders = jest.MockedFunction<typeof getDeliveryOrdersForClient>;
type MockedGetUserByClientId = jest.MockedFunction<typeof getUserByClientId>;

jest.mock('../../../../components/EntitySearch', () => ({
  __esModule: true,
  default: ({ onSelect }: { onSelect: (value: unknown) => void }) => (
    <button onClick={() => onSelect({ name: 'Search Result', client_id: 456 })}>
      Select client
    </button>
  ),
}));

jest.mock('../../../../components/BookingManagementBase', () => ({
  __esModule: true,
  default: ({ user }: { user: { client_id: number } }) => (
    <div data-testid="booking-management-base">History for {user.client_id}</div>
  ),
}));

jest.mock('../../../../api/deliveryOrders', () => ({
  __esModule: true,
  getDeliveryOrdersForClient: jest.fn(),
}));

jest.mock('../../../../api/users', () => ({
  __esModule: true,
  getUserByClientId: jest.fn(),
}));

const mockGetDeliveryOrdersForClient = getDeliveryOrdersForClient as MockedGetOrders;
const mockGetUserByClientId = getUserByClientId as MockedGetUserByClientId;

const originalFetch = globalThis.fetch;

beforeAll(() => {
  (globalThis as any).fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/auth/csrf-token')) {
      return new Response(JSON.stringify({ csrfToken: 'test-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/auth/refresh')) {
      return new Response(null, { status: 200 });
    }
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('role', 'staff');
  localStorage.setItem('name', 'Test Staff');
  localStorage.setItem('access', '[]');
});

describe('UserHistory delivery orders', () => {
  it('skips delivery history when the selected client is not a delivery user', async () => {
    mockGetUserByClientId.mockResolvedValueOnce({
      clientId: 456,
      firstName: 'Search',
      lastName: 'Result',
      email: null,
      phone: null,
      onlineAccess: true,
      hasPassword: true,
      role: 'shopper',
    });

    renderWithProviders(
      <MemoryRouter>
        <UserHistory />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /select client/i }));

    await waitFor(() =>
      expect(mockGetUserByClientId).toHaveBeenCalledWith('456'),
    );

    await waitFor(() =>
      expect(screen.getByTestId('booking-management-base')).toHaveTextContent(
        'History for 456',
      ),
    );
    expect(mockGetDeliveryOrdersForClient).not.toHaveBeenCalled();
    expect(screen.queryByText(/Delivery history/i)).not.toBeInTheDocument();
  });

  it('renders delivery history inline when the selected client has the delivery role', async () => {
    mockGetUserByClientId.mockResolvedValueOnce({
      clientId: 456,
      firstName: 'Search',
      lastName: 'Result',
      email: null,
      phone: null,
      onlineAccess: true,
      hasPassword: true,
      role: 'delivery',
    });
    mockGetDeliveryOrdersForClient.mockResolvedValueOnce([
      {
        id: 10,
        clientId: 456,
        status: 'scheduled',
        createdAt: '2024-05-01T17:00:00.000Z',
        scheduledFor: '2024-05-14T15:30:00.000Z',
        address: '123 Main St',
        phone: '306-555-1234',
        email: 'client@example.com',
        notes: 'Leave at the back door',
        items: [
          {
            itemId: 1,
            quantity: 2,
            categoryId: 7,
            itemName: 'Milk',
            categoryName: 'Dairy',
          },
          {
            itemId: 2,
            quantity: 1,
            categoryId: 9,
            itemName: 'Bread',
            categoryName: 'Bakery',
          },
        ],
      },
    ]);

    renderWithProviders(
      <MemoryRouter>
        <UserHistory />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /select client/i }));

    await waitFor(() =>
      expect(mockGetDeliveryOrdersForClient).toHaveBeenCalledWith(456),
    );

    expect(screen.getByText('Delivery history')).toBeInTheDocument();
    expect(screen.getByText('Active deliveries')).toBeInTheDocument();
    expect(screen.getByText('Order #10')).toBeInTheDocument();
    expect(screen.getByText('Scheduled: Tue, May 14, 2024')).toBeInTheDocument();
    expect(screen.getByText('Address: 123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Phone: 306-555-1234')).toBeInTheDocument();
    expect(screen.getByText('Email: client@example.com')).toBeInTheDocument();
    expect(screen.getByText('Notes: Leave at the back door')).toBeInTheDocument();
    expect(screen.getByText('Milk × 2')).toBeInTheDocument();
    expect(screen.getByText('Bread × 1')).toBeInTheDocument();
    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Bakery')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /show completed deliveries/i }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('booking-management-base')).toHaveTextContent(
        'History for 456',
      ),
    );
  });

  it('only shows active delivery orders by default and reveals completed orders when expanded', async () => {
    mockGetUserByClientId.mockResolvedValueOnce({
      clientId: 456,
      firstName: 'Search',
      lastName: 'Result',
      email: null,
      phone: null,
      onlineAccess: true,
      hasPassword: true,
      role: 'delivery',
    });
    mockGetDeliveryOrdersForClient.mockResolvedValueOnce([
      {
        id: 11,
        clientId: 456,
        status: 'approved',
        createdAt: '2024-05-01T17:00:00.000Z',
        scheduledFor: '2024-05-20T15:30:00.000Z',
        address: '123 Main St',
        phone: '306-555-1234',
        email: 'client@example.com',
        notes: null,
        items: [],
      },
      {
        id: 12,
        clientId: 456,
        status: 'completed',
        createdAt: '2024-04-01T17:00:00.000Z',
        scheduledFor: '2024-04-05T15:30:00.000Z',
        address: '123 Main St',
        phone: '306-555-1234',
        email: 'client@example.com',
        notes: 'Delivered successfully',
        items: [],
      },
    ]);

    renderWithProviders(
      <MemoryRouter>
        <UserHistory />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /select client/i }));

    await waitFor(() =>
      expect(mockGetDeliveryOrdersForClient).toHaveBeenCalledWith(456),
    );

    expect(screen.getByText('Order #11')).toBeInTheDocument();
    const completedOrderHeading = screen.getByText('Order #12');
    expect(completedOrderHeading).not.toBeVisible();

    fireEvent.click(
      screen.getByRole('button', { name: /show completed deliveries/i }),
    );

    expect(completedOrderHeading).toBeVisible();
  });

  it('shows an empty state when no delivery orders are found', async () => {
    mockGetDeliveryOrdersForClient.mockResolvedValueOnce([]);

    renderWithProviders(
      <MemoryRouter>
        <UserHistory
          initialUser={{
            name: 'Client Example',
            client_id: 123,
            role: 'delivery',
          }}
        />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(mockGetDeliveryOrdersForClient).toHaveBeenCalledWith(123),
    );

    expect(screen.getByText('Delivery history')).toBeInTheDocument();
    expect(
      screen.getByText('No active delivery requests right now.'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /show completed deliveries/i }),
    );
    expect(screen.getByText('No completed deliveries yet.')).toBeInTheDocument();
    expect(mockGetUserByClientId).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId('booking-management-base')).toHaveTextContent(
        'History for 123',
      ),
    );
  });
});

describe('UserHistory navigation', () => {
  it('renders the client navigation for shoppers', async () => {
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Client Example');
    localStorage.setItem('userRole', 'shopper');

    renderWithProviders(
      <MemoryRouter>
        <UserHistory
          initialUser={{ name: 'Client Example', client_id: 123, role: 'shopper' }}
        />
      </MemoryRouter>,
    );

    await screen.findByTestId('client-nav');
    expect(screen.queryByTestId('volunteer-nav')).not.toBeInTheDocument();
  });

  it('renders the client navigation for delivery clients', async () => {
    localStorage.setItem('role', 'delivery');
    localStorage.setItem('name', 'Delivery Client');
    localStorage.setItem('userRole', 'delivery');

    renderWithProviders(
      <MemoryRouter>
        <UserHistory
          initialUser={{ name: 'Delivery Client', client_id: 456, role: 'delivery' }}
        />
      </MemoryRouter>,
    );

    await screen.findByTestId('client-nav');
    expect(screen.queryByTestId('volunteer-nav')).not.toBeInTheDocument();
  });

  it('renders the volunteer navigation for volunteers', async () => {
    localStorage.setItem('role', 'volunteer');
    localStorage.setItem('name', 'Volunteer Tester');
    localStorage.setItem('userRole', 'shopper');

    renderWithProviders(
      <MemoryRouter>
        <UserHistory
          initialUser={{ name: 'Client Example', client_id: 789, role: 'shopper' }}
        />
      </MemoryRouter>,
    );

    await screen.findByTestId('volunteer-nav');
    expect(screen.queryByTestId('client-nav')).not.toBeInTheDocument();
  });

  it('keeps staff view without bottom navigation', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Staff Tester');
    localStorage.setItem('access', '[]');
    localStorage.removeItem('userRole');

    renderWithProviders(
      <MemoryRouter>
        <UserHistory
          initialUser={{ name: 'Client Example', client_id: 321, role: 'shopper' }}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('client-nav')).not.toBeInTheDocument();
      expect(screen.queryByTestId('volunteer-nav')).not.toBeInTheDocument();
    });
  });
});
