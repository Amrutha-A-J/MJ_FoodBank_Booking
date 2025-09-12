import en from '../../../../public/locales/en/translation.json';
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from '../../../../testUtils/renderWithProviders';
import '@testing-library/jest-dom';
import PantryVisits from '../PantryVisits';
import { MemoryRouter } from 'react-router-dom';

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('shows date in weekday tabs', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-13'));
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderVisits();

    await screen.findByText('Record Visit');
    expect(screen.getByText('May 13')).toBeInTheDocument();

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

    await screen.findByText('Alice');
    expect(screen.getByText('Bob')).toBeInTheDocument();

    const search = screen.getByLabelText('Search');
    fireEvent.change(search, { target: { value: 'Bob' } });
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: '111' } });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
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

    expect(await screen.findByText('111')).toBeInTheDocument();
    expect(screen.getByText('222 (ANONYMOUS)')).toBeInTheDocument();
    expect(screen.getByText('Clients: 1')).toBeInTheDocument();
    expect(screen.getByText('Sunshine Bag Clients: 2')).toBeInTheDocument();
    expect(screen.getByText('Total Weight: 32')).toBeInTheDocument();
    expect(screen.getByText('Adults: 1')).toBeInTheDocument();
    expect(screen.getByText('Children: 2')).toBeInTheDocument();
    expect(screen.getByText('Sunshine Bag Weight: 12')).toBeInTheDocument();
  });

  it('shows N/A for missing client info', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([{ id: 1, date: '2024-01-01', clientId: null, clientName: null, anonymous: false, adults: 0, children: 0, verified: false }]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);
    renderVisits();
    expect(await screen.findAllByText(en.not_applicable)).toHaveLength(2);
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

    await screen.findByText('Alice');
    const checkbox = screen.getByRole('checkbox', { name: /verify visit/i });
    expect(screen.getByLabelText('Edit visit')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete visit')).toBeInTheDocument();

    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(toggleClientVisitVerification).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.queryByLabelText('Edit visit')).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('Delete visit')).not.toBeInTheDocument(),
    );

    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(toggleClientVisitVerification).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Edit visit')).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Delete visit')).toBeInTheDocument(),
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

    await screen.findByText('Alice');

    expect(screen.getByText('Mon, May 13, 2024')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('shows "No records" when there are no visits', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    renderVisits();

    expect(await screen.findByText('No records')).toBeInTheDocument();
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
