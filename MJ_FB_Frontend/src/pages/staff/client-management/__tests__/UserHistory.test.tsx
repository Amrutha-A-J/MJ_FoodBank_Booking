import {
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
} from '../../../../../testUtils/renderWithProviders';
import { MemoryRouter } from 'react-router-dom';
import UserHistory from '../UserHistory';
import { getDeliveryOrdersForClient } from '../../../../api/deliveryOrders';

type MockedGetOrders = jest.MockedFunction<typeof getDeliveryOrdersForClient>;

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

const mockGetDeliveryOrdersForClient = getDeliveryOrdersForClient as MockedGetOrders;

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
  it('fetches delivery orders when a client is selected from search', async () => {
    mockGetDeliveryOrdersForClient.mockResolvedValueOnce([]);

    renderWithProviders(
      <MemoryRouter>
        <UserHistory />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /select client/i }));

    await waitFor(() => {
      expect(mockGetDeliveryOrdersForClient).toHaveBeenCalledWith(456);
    });
  });

  it('displays delivery order details for the selected client', async () => {
    mockGetDeliveryOrdersForClient.mockResolvedValueOnce([
      {
        id: 10,
        clientId: 123,
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
        <UserHistory initialUser={{ name: 'Client Example', client_id: 123 }} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockGetDeliveryOrdersForClient).toHaveBeenCalledWith(123);
    });

    expect(await screen.findByText('Order #10')).toBeInTheDocument();
    expect(screen.getByText('Scheduled: Tue, May 14, 2024')).toBeInTheDocument();
    expect(screen.getByText('Address: 123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Phone: 306-555-1234')).toBeInTheDocument();
    expect(screen.getByText('Email: client@example.com')).toBeInTheDocument();
    expect(screen.getByText('Notes: Leave at the back door')).toBeInTheDocument();
    expect(screen.getByText('Milk × 2')).toBeInTheDocument();
    expect(screen.getByText('Bread × 1')).toBeInTheDocument();
    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Bakery')).toBeInTheDocument();
  });
});
