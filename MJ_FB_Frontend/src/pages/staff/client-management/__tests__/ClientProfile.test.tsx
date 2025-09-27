import {
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
} from '../../../../../testUtils/renderWithProviders';
import * as Router from 'react-router-dom';
import ClientProfile from '../ClientProfile';
import { getUserByClientId } from '../../../../api/users';
import {
  getBookingHistory,
  getSlots,
  cancelBooking,
  rescheduleBookingByToken,
} from '../../../../api/bookings';
import { deleteClientVisit } from '../../../../api/clientVisits';
import { getDeliveryOrdersForClient } from '../../../../api/deliveryOrders';
import { handleSave, handleSendReset } from '../EditClientDialog';

jest.mock('../../../../components/PantryQuickLinks', () => ({
  __esModule: true,
  default: () => <div data-testid="pantry-quick-links" />,
}));

jest.mock('../../../../components/account/AccountEditForm', () => ({
  __esModule: true,
  default: ({
    onSave,
    onSecondaryAction,
    initialData,
  }: {
    onSave: (data: any) => Promise<boolean> | boolean;
    onSecondaryAction?: (data: any) => void;
    initialData: any;
  }) => (
    <div data-testid="account-edit-form">
      <button onClick={() => onSave(initialData)}>Save changes</button>
      {onSecondaryAction && (
        <button onClick={() => onSecondaryAction(initialData)}>Send reset</button>
      )}
    </div>
  ),
}));

jest.mock('../../../../api/users', () => ({
  __esModule: true,
  getUserByClientId: jest.fn(),
}));

jest.mock('../../../../api/bookings', () => ({
  __esModule: true,
  getBookingHistory: jest.fn(),
  getSlots: jest.fn(),
  cancelBooking: jest.fn(),
  rescheduleBookingByToken: jest.fn(),
}));

jest.mock('../../../../api/clientVisits', () => ({
  __esModule: true,
  deleteClientVisit: jest.fn(),
}));

jest.mock('../../../../api/deliveryOrders', () => ({
  __esModule: true,
  getDeliveryOrdersForClient: jest.fn(),
}));

jest.mock('../EditClientDialog', () => ({
  handleSave: jest.fn(),
  handleSendReset: jest.fn(),
}));

const mockGetUserByClientId = getUserByClientId as jest.MockedFunction<
  typeof getUserByClientId
>;
const mockGetBookingHistory = getBookingHistory as jest.MockedFunction<
  typeof getBookingHistory
>;
const mockGetSlots = getSlots as jest.MockedFunction<typeof getSlots>;
const mockCancelBooking = cancelBooking as jest.MockedFunction<typeof cancelBooking>;
const mockReschedule = rescheduleBookingByToken as jest.MockedFunction<
  typeof rescheduleBookingByToken
>;
const mockDeleteVisit = deleteClientVisit as jest.MockedFunction<typeof deleteClientVisit>;
const mockGetDeliveryOrdersForClient = getDeliveryOrdersForClient as jest.MockedFunction<
  typeof getDeliveryOrdersForClient
>;
const mockHandleSave = handleSave as jest.MockedFunction<typeof handleSave>;
const mockHandleSendReset = handleSendReset as jest.MockedFunction<typeof handleSendReset>;

const originalFetch = globalThis.fetch;

beforeAll(() => {
  (globalThis as any).fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
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
  localStorage.setItem('name', 'Staff Member');
  localStorage.setItem('access', '[]');
});

const renderProfile = () => {
  return renderWithProviders(
    <Router.MemoryRouter initialEntries={['/pantry/client-management/clients/456']}>
      <Router.Routes>
        <Router.Route
          path="/pantry/client-management/clients/:clientId"
          element={<ClientProfile />}
        />
      </Router.Routes>
    </Router.MemoryRouter>,
  );
};

describe('ClientProfile', () => {
  it('renders client details, booking history, edit dialog, and delivery history', async () => {
    mockGetUserByClientId.mockResolvedValue({
      clientId: 456,
      firstName: 'Search',
      lastName: 'Result',
      email: 'client@example.com',
      phone: '306-555-1234',
      address: '123 Main St',
      onlineAccess: true,
      hasPassword: true,
      role: 'delivery',
      bookingsThisMonth: 2,
    } as any);
    mockGetBookingHistory.mockResolvedValue([
      {
        id: 1,
        status: 'visited',
        date: '2024-05-01',
        slot_id: null,
        client_id: 456,
        reschedule_token: 'token',
        rescheduleToken: 'token',
        newClientId: null,
        start_time: '09:00',
        end_time: '09:15',
        startTime: '09:00',
        endTime: '09:15',
      },
    ] as any);
    mockGetSlots.mockResolvedValue([]);
    mockCancelBooking.mockResolvedValue(undefined);
    mockReschedule.mockResolvedValue(undefined);
    mockDeleteVisit.mockResolvedValue(undefined);
    mockGetDeliveryOrdersForClient.mockResolvedValue([
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
          { itemId: 1, quantity: 2, categoryId: 7, itemName: 'Milk', categoryName: 'Dairy' },
        ],
      },
    ] as any);
    mockHandleSave.mockImplementation(async (_id, _data, _onClientUpdated, onUpdated, onClose) => {
      onUpdated('Client updated', 'success');
      onClose();
      return true;
    });
    mockHandleSendReset.mockImplementation(async (_id, _data, _onClientUpdated, onUpdated, onClose) => {
      onUpdated('Password reset link sent', 'success');
      onClose();
      return true;
    });

    renderProfile();

    expect(screen.getByLabelText('Loading client')).toBeInTheDocument();

    await waitFor(() => expect(mockGetUserByClientId).toHaveBeenCalledWith('456'));

    expect(screen.getByTestId('client-name')).toHaveTextContent('Search Result');
    expect(screen.getByTestId('monthly-usage-chip')).toHaveTextContent('2 uses this month');
    expect(screen.getByText('client@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Client/i })).toBeInTheDocument();
    await screen.findByText('Order #10');
    await screen.findByText('Delete visit');

    fireEvent.click(screen.getByRole('button', { name: /Edit Client/i }));
    const form = await screen.findByTestId('account-edit-form');
    expect(form).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    const messages = await screen.findAllByText('Client updated');
    expect(messages.length).toBeGreaterThan(0);
  });
});
