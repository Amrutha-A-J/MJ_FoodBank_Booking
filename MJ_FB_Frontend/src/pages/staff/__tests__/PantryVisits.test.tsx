import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  within,
} from '../../../../testUtils/renderWithProviders';
import '@testing-library/jest-dom';
import PantryVisits from '../PantryVisits';
import { MemoryRouter } from 'react-router-dom';
import { formatLocaleDate } from '../../../utils/date';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as any),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
}));

jest.mock('../../../api/clientVisits', () => ({
  getClientVisits: jest.fn(),
  createClientVisit: jest.fn(),
  updateClientVisit: jest.fn(),
  deleteClientVisit: jest.fn(),
  toggleClientVisitVerification: jest.fn(),
}));

jest.mock('../../../api/users', () => ({
  addUser: jest.fn(),
  getUserByClientId: jest.fn(),
}));

jest.mock('../../../api/appConfig', () => ({
  getAppConfig: jest.fn(),
}));

jest.mock('../../../api/sunshineBags', () => ({
  getSunshineBag: jest.fn(),
  saveSunshineBag: jest.fn(),
}));

const { getClientVisits, toggleClientVisitVerification } =
  jest.requireMock('../../../api/clientVisits');
const { getAppConfig } = jest.requireMock('../../../api/appConfig');
const { getSunshineBag } = jest.requireMock('../../../api/sunshineBags');

const originalMatchMedia = window.matchMedia;

function renderVisits() {
  return renderWithProviders(
    <MemoryRouter>
      <PantryVisits />
    </MemoryRouter>,
  );
}

describe('PantryVisits', () => {
  beforeAll(() => {
    window.matchMedia =
      window.matchMedia ||
      ((() => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as any);
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
  });

  const getActivePanel = () => screen.getByRole('tabpanel', { hidden: false });

  it('shows date in weekday tabs', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-13T12:00:00Z'));
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderVisits();

    await screen.findByText('Record Visit');
    const expectedTab = formatLocaleDate(new Date('2024-05-13T12:00:00Z'), {
      month: 'short',
      day: 'numeric',
    });
    expect(screen.getByText(expectedTab)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('fetches cart tare for pantry staff and auto-deducts weight', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 10 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderVisits();

    await waitFor(() => expect(getAppConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Record Visit'));

    const withCart = screen.getByLabelText('Weight With Cart');
    fireEvent.change(withCart, { target: { value: '50' } });

    await waitFor(() =>
      expect(screen.getByLabelText('Weight Without Cart')).toHaveValue(40),
    );
  });

  it('selects only one visit type and can return to regular', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderVisits();

    await screen.findByText('Record Visit');
    fireEvent.click(screen.getByText('Record Visit'));

    const regular = screen.getByLabelText('Regular visit');
    const anonymous = screen.getByLabelText('Anonymous visit');
    const sunshine = screen.getByLabelText('Sunshine bag?');

    expect(regular).toBeChecked();

    fireEvent.click(anonymous);
    expect(anonymous).toBeChecked();
    expect(sunshine).not.toBeChecked();
    expect(screen.getByLabelText('Client ID')).toBeInTheDocument();

    fireEvent.click(sunshine);
    await waitFor(() => expect(screen.getByLabelText('Sunshine bag?')).toBeChecked());
    expect(anonymous).not.toBeChecked();
    expect(screen.queryByLabelText('Client ID')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Sunshine Bag Weight')).toBeInTheDocument();
    expect(screen.getByLabelText('Sunshine Bag Clients')).toBeInTheDocument();

    fireEvent.click(regular);
    await waitFor(() => expect(screen.getByLabelText('Regular visit')).toBeChecked());
    expect(screen.queryByLabelText('Sunshine Bag Weight')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sunshine Bag Clients')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Client ID')).toBeInTheDocument();
  });

  it('filters visits by search input', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([
      {
        id: 1,
        date: '2024-01-01',
        clientId: 111,
        clientName: 'Alice',
        anonymous: false,
        weightWithCart: 10,
        weightWithoutCart: 5,
        petItem: 0,
        adults: 1,
        children: 2,
        verified: false,
      },
      {
        id: 2,
        date: '2024-01-02',
        clientId: 222,
        clientName: 'Bob',
        anonymous: false,
        weightWithCart: 20,
        weightWithoutCart: 15,
        petItem: 1,
        adults: 3,
        children: 4,
        verified: false,
      },
    ]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderVisits();

    const panel = getActivePanel();
    await within(panel).findByText('Alice');
    expect(within(panel).getByText('Bob')).toBeInTheDocument();

    const search = screen.getByTestId('entity-search-input');
    fireEvent.change(search, { target: { value: 'Bob' } });
    expect(within(panel).queryByText('Alice')).not.toBeInTheDocument();
    expect(within(panel).getByText('Bob')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: '111' } });
    expect(within(panel).getByText('Alice')).toBeInTheDocument();
    expect(within(panel).queryByText('Bob')).not.toBeInTheDocument();
  });

  it('renders profile link with descriptive text', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([
      {
        id: 1,
        date: '2024-01-01',
        clientId: 111,
        clientName: 'Alice',
        anonymous: false,
        weightWithCart: 10,
        weightWithoutCart: 5,
        petItem: 0,
        adults: 1,
        children: 2,
        verified: false,
      },
    ]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderVisits();

    const panel = getActivePanel();
    const link = await within(panel).findByRole('link', { name: /open profile/i });
    expect(link).toHaveAttribute(
      'href',
      'https://portal.link2feed.ca/org/1605/intake/111',
    );
  });

  it('shows summary for visits', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([
      {
        id: 1,
        date: '2024-01-01',
        clientId: 111,
        clientName: 'Alice',
        anonymous: false,
        weightWithCart: 10,
        weightWithoutCart: 5,
        petItem: 2,
        adults: 1,
        children: 2,
        verified: false,
      },
      {
        id: 2,
        date: '2024-01-01',
        clientId: 222,
        clientName: 'Bob',
        anonymous: true,
        weightWithCart: 20,
        weightWithoutCart: 15,
        petItem: 1,
        adults: 3,
        children: 4,
        verified: false,
      },
    ]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue({ date: '2024-01-01', weight: 12, clientCount: 2 });

    renderVisits();

    const panel = getActivePanel();
    expect(await within(panel).findByText('111')).toBeInTheDocument();
    expect(within(panel).getByText('222 (ANONYMOUS)')).toBeInTheDocument();
    expect(within(panel).getByText('Orders: 2 (+ 1 anonymous)')).toBeInTheDocument();
    expect(within(panel).getByText('Sunshine Bag Clients: 2')).toBeInTheDocument();
    expect(within(panel).getByText('Total Weight: 32')).toBeInTheDocument();
    expect(within(panel).getByText('Adults: 4')).toBeInTheDocument();
    expect(within(panel).getByText('Children: 6')).toBeInTheDocument();
    expect(within(panel).getByText('Sunshine Bag Weight: 12')).toBeInTheDocument();
  });

  it('shows N/A for missing client info', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([{ id: 1, date: '2024-01-01', clientId: null, clientName: null, anonymous: false, adults: 0, children: 0, verified: false }]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);
    renderVisits();
    const panel = getActivePanel();
    expect(await within(panel).findAllByText('N/A')).toHaveLength(2);
  });
  it('toggles verification and hides actions', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([
      {
        id: 1,
        date: '2024-01-01',
        clientId: 111,
        clientName: 'Alice',
        anonymous: false,
        weightWithCart: 10,
        weightWithoutCart: 5,
        petItem: 0,
        adults: 1,
        children: 0,
        verified: false,
      },
    ]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);
    (toggleClientVisitVerification as jest.Mock)
      .mockResolvedValueOnce({
        id: 1,
        date: '2024-01-01',
        clientId: 111,
        clientName: 'Alice',
        anonymous: false,
        weightWithCart: 10,
        weightWithoutCart: 5,
        petItem: 0,
        adults: 1,
        children: 0,
        verified: true,
      })
      .mockResolvedValueOnce({
        id: 1,
        date: '2024-01-01',
        clientId: 111,
        clientName: 'Alice',
        anonymous: false,
        weightWithCart: 10,
        weightWithoutCart: 5,
        petItem: 0,
        adults: 1,
        children: 0,
        verified: false,
      });

    renderVisits();

    const panel = getActivePanel();
    await within(panel).findByText('Alice');
    const checkbox = within(panel).getByRole('checkbox', { name: /verify visit/i });
    expect(within(panel).getByLabelText('Edit visit')).toBeInTheDocument();
    expect(within(panel).getByLabelText('Delete visit')).toBeInTheDocument();

    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(toggleClientVisitVerification).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(within(panel).getByText('Alice')).toBeInTheDocument());
    await waitFor(() =>
      expect(within(panel).queryByLabelText('Edit visit')).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(within(panel).queryByLabelText('Delete visit')).not.toBeInTheDocument(),
    );

    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(toggleClientVisitVerification).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(within(panel).getByLabelText('Edit visit')).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(within(panel).getByLabelText('Delete visit')).toBeInTheDocument(),
    );
  });

  it('displays visit dates without timezone shift', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-13T12:00:00Z'));
    (getClientVisits as jest.Mock).mockResolvedValue([
      {
        id: 1,
        date: '2024-05-13',
        clientId: 111,
        clientName: 'Alice',
        anonymous: false,
        weightWithCart: null,
        weightWithoutCart: null,
        petItem: 0,
        adults: 1,
        children: 0,
        verified: false,
      },
    ]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderVisits();

    const panel = getActivePanel();
    await within(panel).findByText('Alice');

    const expectedDate = formatLocaleDate('2024-05-13', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    expect(
      within(panel).getByRole('heading', { name: `Summary of ${expectedDate},` }),
    ).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('shows row numbers for visits', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([
      {
        id: 1,
        date: '2024-01-01',
        clientId: 111,
        clientName: 'Alice',
        anonymous: false,
        weightWithCart: 10,
        weightWithoutCart: 5,
        petItem: 0,
        adults: 1,
        children: 0,
        verified: false,
      },
      {
        id: 2,
        date: '2024-01-01',
        clientId: 222,
        clientName: 'Bob',
        anonymous: false,
        weightWithCart: 20,
        weightWithoutCart: 15,
        petItem: 0,
        adults: 1,
        children: 0,
        verified: false,
      },
    ]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderVisits();

    const panel = getActivePanel();
    await within(panel).findByText('Bob');

    const rows = within(panel).getAllByRole('row');
    expect(within(rows[1]).getAllByRole('cell')[0]).toHaveTextContent('1');
    expect(within(rows[2]).getAllByRole('cell')[0]).toHaveTextContent('2');
  });

  it('shows "No records" when there are no visits', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderVisits();

    const panel = getActivePanel();
    expect(await within(panel).findByText('No records')).toBeInTheDocument();
  });

  it('navigates to selected date', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderWithProviders(<PantryVisits />);

    await screen.findByText('Record Visit');

    const dateInput = screen.getByLabelText('Lookup Date');
    fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
    fireEvent.click(screen.getByText('Go'));

    expect(mockNavigate).toHaveBeenCalledWith('/pantry/visits?date=2024-01-15');
  });
});
