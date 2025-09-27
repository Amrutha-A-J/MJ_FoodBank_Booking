import {
  fireEvent,
  renderWithProviders,
  screen,
} from '../../../../../testUtils/renderWithProviders';
import * as Router from 'react-router-dom';
import UserHistory from '../UserHistory';

const navigateMock = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
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
  default: ({
    onSelect,
    onNotFound,
  }: {
    onSelect: (value: unknown) => void;
    onNotFound?: (clientId: string) => void;
  }) => (
    <>
      <button onClick={() => onSelect({ name: 'Search Result', client_id: 456 })}>
        Select client
      </button>
      <button onClick={() => onNotFound?.('789')}>Not found</button>
    </>
  ),
}));

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
  navigateMock.mockReset();
  localStorage.clear();
});

describe('UserHistory staff navigation', () => {
  beforeEach(() => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', '[]');
  });

  it('navigates to the client profile when a result is selected', () => {
    renderWithProviders(
      <Router.MemoryRouter>
        <UserHistory />
      </Router.MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /select client/i }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/pantry/client-management/clients/456',
    );
  });

  it('opens the add client confirmation when a client ID is not found', () => {
    renderWithProviders(
      <Router.MemoryRouter>
        <UserHistory />
      </Router.MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /not found/i }));

    expect(screen.getByText('Add client 789?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/pantry/client-management?tab=add&clientId=789',
    );
  });
});

describe('UserHistory navigation', () => {
  it('renders the client navigation for shoppers', async () => {
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Client Example');
    localStorage.setItem('userRole', 'shopper');

    renderWithProviders(
      <Router.MemoryRouter>
        <UserHistory
          initialUser={{ name: 'Client Example', client_id: 123, role: 'shopper' }}
        />
      </Router.MemoryRouter>,
    );

    await screen.findByTestId('client-nav');
    expect(screen.queryByTestId('volunteer-nav')).not.toBeInTheDocument();
  });

  it('renders the client navigation for delivery clients', async () => {
    localStorage.setItem('role', 'delivery');
    localStorage.setItem('name', 'Delivery Client');
    localStorage.setItem('userRole', 'delivery');

    renderWithProviders(
      <Router.MemoryRouter>
        <UserHistory
          initialUser={{ name: 'Delivery Client', client_id: 456, role: 'delivery' }}
        />
      </Router.MemoryRouter>,
    );

    await screen.findByTestId('client-nav');
    expect(screen.queryByTestId('volunteer-nav')).not.toBeInTheDocument();
  });

  it('renders the volunteer navigation for volunteers', async () => {
    localStorage.setItem('role', 'volunteer');
    localStorage.setItem('name', 'Volunteer Tester');
    localStorage.setItem('userRole', 'shopper');

    renderWithProviders(
      <Router.MemoryRouter>
        <UserHistory
          initialUser={{ name: 'Client Example', client_id: 789, role: 'shopper' }}
        />
      </Router.MemoryRouter>,
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
      <Router.MemoryRouter>
        <UserHistory
          initialUser={{ name: 'Client Example', client_id: 321, role: 'shopper' }}
        />
      </Router.MemoryRouter>,
    );

    await screen.findByText(/Client history/i);
    expect(screen.queryByTestId('client-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('volunteer-nav')).not.toBeInTheDocument();
  });
});
