import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PantryVisits from '../PantryVisits';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';

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
  importVisitsXlsx: jest.fn(),
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

const { getClientVisits, importVisitsXlsx } = jest.requireMock('../../../api/clientVisits');
const { getAppConfig } = jest.requireMock('../../../api/appConfig');
const { getSunshineBag } = jest.requireMock('../../../api/sunshineBags');

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

  it('uses cart tare from config when calculating weight', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 10 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    render(
      <ThemeProvider theme={theme}>
        <PantryVisits />
      </ThemeProvider>,
    );

    await waitFor(() => expect(getAppConfig).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Record Visit'));

    const withCart = screen.getByLabelText('Weight With Cart');
    fireEvent.change(withCart, { target: { value: '50' } });

    const withoutCart = screen.getByLabelText('Weight Without Cart');
    expect(withoutCart).toHaveValue(40);
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
      },
    ]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    render(
      <ThemeProvider theme={theme}>
        <PantryVisits />
      </ThemeProvider>,
    );

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
      },
      {
        id: 2,
        date: '2024-01-01',
        clientId: 222,
        clientName: 'Bob',
        anonymous: false,
        weightWithCart: 20,
        weightWithoutCart: 15,
        petItem: 1,
        adults: 3,
        children: 4,
      },
    ]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue({ date: '2024-01-01', weight: 12 });

    render(
      <ThemeProvider theme={theme}>
        <PantryVisits />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Clients: 2')).toBeInTheDocument();
    expect(screen.getByText('Total Weight: 20')).toBeInTheDocument();
    expect(screen.getByText('Adults: 4')).toBeInTheDocument();
    expect(screen.getByText('Children: 6')).toBeInTheDocument();
    expect(screen.getByText('Sunshine Bag Weight: 12')).toBeInTheDocument();
  });

  it('shows "No records" when there are no visits', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    render(
      <ThemeProvider theme={theme}>
        <PantryVisits />
      </ThemeProvider>,
    );

    expect(await screen.findByText('No records')).toBeInTheDocument();
  });

  it('shows preview after dry-run', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);
    (importVisitsXlsx as jest.Mock).mockResolvedValue({
      sheets: [{ date: '2024-02-01', rows: 2, errors: ['bad row'] }],
    });

    render(
      <ThemeProvider theme={theme}>
        <PantryVisits />
      </ThemeProvider>,
    );

    await screen.findByText('Record Visit');

    fireEvent.click(screen.getByText('Import Visits'));
    const input = screen.getByTestId('import-input') as HTMLInputElement;
    const file = new File(['1'], 'visits.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByText('Dry-run'));

    await waitFor(() =>
      expect(importVisitsXlsx).toHaveBeenCalledWith(
        expect.any(FormData),
        'skip',
        true,
      ),
    );

    expect(await screen.findByText('bad row')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('passes duplicate strategy to API', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);
    (importVisitsXlsx as jest.Mock).mockResolvedValue(undefined);

    render(
      <ThemeProvider theme={theme}>
        <PantryVisits />
      </ThemeProvider>,
    );

    await screen.findByText('Record Visit');

    fireEvent.click(screen.getByText('Import Visits'));
    const input = screen.getByTestId('import-input') as HTMLInputElement;
    const file = new File(['1'], 'visits.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByLabelText('Update'));
    fireEvent.click(screen.getByText('Import'));

    await waitFor(() =>
      expect(importVisitsXlsx).toHaveBeenCalledWith(
        expect.any(FormData),
        'update',
      ),
    );
  });

  it('navigates to selected date', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });
    (getSunshineBag as jest.Mock).mockResolvedValue(null);

    render(
      <ThemeProvider theme={theme}>
        <PantryVisits />
      </ThemeProvider>,
    );

    await screen.findByText('Record Visit');

    const dateInput = screen.getByLabelText('Lookup Date');
    fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
    fireEvent.click(screen.getByText('Go'));

    expect(mockNavigate).toHaveBeenCalledWith('/pantry/visits?date=2024-01-15');
  });
});
