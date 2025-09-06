import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PantryVisits from '../PantryVisits';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';

jest.mock('../../../api/clientVisits', () => ({
  getClientVisits: jest.fn(),
  createClientVisit: jest.fn(),
  updateClientVisit: jest.fn(),
  deleteClientVisit: jest.fn(),
}));

jest.mock('../../../api/users', () => ({
  addUser: jest.fn(),
  getUserByClientId: jest.fn(),
}));

jest.mock('../../../api/appConfig', () => ({
  getAppConfig: jest.fn(),
}));

const { getClientVisits } = jest.requireMock('../../../api/clientVisits');
const { getAppConfig } = jest.requireMock('../../../api/appConfig');

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
  });

  it('uses cart tare from config when calculating weight', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 10 });

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
        adults: 2,
        children: 3,
      },
    ]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });

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
        children: 1,
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
        adults: 2,
        children: 3,
      },
    ]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });

    render(
      <ThemeProvider theme={theme}>
        <PantryVisits />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Clients: 2')).toBeInTheDocument();
    expect(screen.getByText('Total Weight: 20')).toBeInTheDocument();
    expect(screen.getByText('Sunshine Bags: 3')).toBeInTheDocument();
    expect(screen.getByText('Adults: 3')).toBeInTheDocument();
    expect(screen.getByText('Children: 4')).toBeInTheDocument();
  });

  it('shows "No records" when there are no visits', async () => {
    (getClientVisits as jest.Mock).mockResolvedValue([]);
    (getAppConfig as jest.Mock).mockResolvedValue({ cartTare: 0 });

    render(
      <ThemeProvider theme={theme}>
        <PantryVisits />
      </ThemeProvider>,
    );

    expect(await screen.findByText('No records')).toBeInTheDocument();
  });
});
