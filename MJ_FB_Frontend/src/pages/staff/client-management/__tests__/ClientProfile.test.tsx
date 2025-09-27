import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  renderWithProviders,
  screen,
  waitFor,
} from '../../../../../testUtils/renderWithProviders';
import userEvent from '@testing-library/user-event';
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

const mockGetUserByClientId =
  getUserByClientId as jest.MockedFunction<typeof getUserByClientId>;
const mockGetBookingHistory =
  getBookingHistory as jest.MockedFunction<typeof getBookingHistory>;
const mockGetSlots = getSlots as jest.MockedFunction<typeof getSlots>;
const mockCancelBooking = cancelBooking as jest.MockedFunction<typeof cancelBooking>;
const mockRescheduleBookingByToken =
  rescheduleBookingByToken as jest.MockedFunction<typeof rescheduleBookingByToken>;
const mockDeleteClientVisit =
  deleteClientVisit as jest.MockedFunction<typeof deleteClientVisit>;
const mockGetDeliveryOrdersForClient =
  getDeliveryOrdersForClient as jest.MockedFunction<typeof getDeliveryOrdersForClient>;

describe('ClientProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', '[]');
  });

  it('renders client details, booking history, and delivery history', async () => {
    mockGetUserByClientId.mockResolvedValue({
      clientId: 123,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
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
        date: '2024-06-10',
        start_time: '09:00:00',
        end_time: '09:30:00',
        status: 'visited',
        slot_id: null,
      },
    ] as any);
    mockGetSlots.mockResolvedValue([]);
    mockCancelBooking.mockResolvedValue(undefined);
    mockRescheduleBookingByToken.mockResolvedValue(undefined);
    mockDeleteClientVisit.mockResolvedValue(undefined);
    mockGetDeliveryOrdersForClient.mockResolvedValue([
      {
        id: 10,
        clientId: 123,
        status: 'scheduled',
        scheduledFor: '2024-06-15T15:30:00.000Z',
        address: '123 Main St',
        phone: '306-555-1234',
        email: 'jane@example.com',
        notes: 'Leave at the front door',
        items: [
          {
            itemId: 1,
            itemName: 'Milk',
            quantity: 2,
            categoryName: 'Dairy',
          },
        ],
      },
      {
        id: 11,
        clientId: 123,
        status: 'completed',
        scheduledFor: '2024-05-20T18:00:00.000Z',
        address: '123 Main St',
        phone: '306-555-1234',
        email: 'jane@example.com',
        notes: null,
        items: [],
      },
    ] as any);

    renderWithProviders(
      <MemoryRouter initialEntries={['/pantry/client-management/clients/123']}>
        <Routes>
          <Route
            path="/pantry/client-management/clients/:clientId"
            element={<ClientProfile />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('2 uses this month')).toBeInTheDocument();
    expect(screen.getByText('Client ID')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('Delivery history')).toBeInTheDocument();
    expect(await screen.findByText(/Order #10/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(mockGetBookingHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          includeVisits: true,
          userId: 123,
          includeStaffNotes: true,
        }),
      ),
    );

    await waitFor(() =>
      expect(mockGetDeliveryOrdersForClient).toHaveBeenCalledWith(123),
    );

    expect(await screen.findByText(/visited/i)).toBeInTheDocument();

    const editButton = await screen.findByRole('button', { name: /edit client/i });
    await userEvent.click(editButton);
    expect(await screen.findByLabelText(/First name/i)).toHaveValue('Jane');
  });
});
