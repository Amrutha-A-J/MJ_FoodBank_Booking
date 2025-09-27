import {
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
} from '../../../../../testUtils/renderWithProviders';
import { MemoryRouter } from 'react-router-dom';
import UserHistory from '../UserHistory';
import { getUserByClientId } from '../../../../api/users';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../../../components/ClientBottomNav', () => ({
  __esModule: true,
  default: () => <div data-testid="client-nav" />,
}));

jest.mock('../../../../components/VolunteerBottomNav', () => ({
  __esModule: true,
  default: () => <div data-testid="volunteer-nav" />,
}));

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

jest.mock('../../../../api/users', () => ({
  __esModule: true,
  getUserByClientId: jest.fn(),
}));

const mockGetUserByClientId =
  getUserByClientId as jest.MockedFunction<typeof getUserByClientId>;

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
  mockNavigate.mockReset();
  localStorage.clear();
  localStorage.setItem('role', 'staff');
  localStorage.setItem('name', 'Test Staff');
  localStorage.setItem('access', '[]');
});

describe('UserHistory staff navigation', () => {
  it('navigates to client profile when staff selects a client', async () => {
    renderWithProviders(
      <MemoryRouter>
        <UserHistory />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /select client/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        '/pantry/client-management/clients/456',
      ),
    );
    expect(screen.queryByTestId('booking-management-base')).not.toBeInTheDocument();
    expect(mockGetUserByClientId).not.toHaveBeenCalled();
  });

  it('navigates to client profile when a clientId query parameter is present', async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/pantry/client-management?clientId=789']}>
        <UserHistory />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        '/pantry/client-management/clients/789',
      ),
    );
    expect(mockGetUserByClientId).not.toHaveBeenCalled();
  });
});
