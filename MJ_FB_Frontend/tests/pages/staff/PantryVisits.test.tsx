import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PantryVisits from '../../../src/pages/staff/PantryVisits';
import { renderWithProviders, screen, waitFor, within } from '../../../testUtils/renderWithProviders';
import { getClientVisits } from '../../../src/api/clientVisits';
import { getSunshineBag } from '../../../src/api/sunshineBags';
import { addUser, getUserByClientId } from '../../../src/api/users';

jest.mock('../../../src/api/clientVisits', () => ({
  getClientVisits: jest.fn(),
  createClientVisit: jest.fn(),
  updateClientVisit: jest.fn(),
  deleteClientVisit: jest.fn(),
  toggleClientVisitVerification: jest.fn(),
}));

jest.mock('../../../src/api/sunshineBags', () => ({
  getSunshineBag: jest.fn(),
  saveSunshineBag: jest.fn(),
}));

jest.mock('../../../src/api/users', () => ({
  addUser: jest.fn(),
  getUserByClientId: jest.fn(),
}));

jest.mock('../../../src/hooks/useAppConfig', () => ({
  __esModule: true,
  default: () => ({
    appConfig: { cartTare: 0 },
    isLoading: false,
    refetch: jest.fn(),
    error: null,
  }),
}));

jest.mock('../../../src/components/PantryQuickLinks', () => () => (
  <div data-testid="pantry-quick-links" />
));

jest.mock('../../../src/components/ResponsiveTable', () => ({
  __esModule: true,
  default: () => <div data-testid="responsive-table" />,
}));

describe('PantryVisits record dialog', () => {
  const getClientVisitsMock = getClientVisits as jest.MockedFunction<typeof getClientVisits>;
  const getSunshineBagMock = getSunshineBag as jest.MockedFunction<typeof getSunshineBag>;
  const getUserByClientIdMock = getUserByClientId as jest.MockedFunction<typeof getUserByClientId>;
  const addUserMock = addUser as jest.MockedFunction<typeof addUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    getClientVisitsMock.mockResolvedValue([]);
    getSunshineBagMock.mockResolvedValue({ weight: 0, clientCount: 0 });
    getUserByClientIdMock.mockResolvedValue({
      clientId: 1234,
      firstName: 'Test',
      lastName: 'User',
      email: null,
      phone: null,
      onlineAccess: false,
      hasPassword: false,
      role: 'shopper',
    } as any);
    addUserMock.mockResolvedValue();
  });

  it('keeps Save disabled after a failed lookup until the client is created', async () => {
    getUserByClientIdMock.mockRejectedValueOnce(new Error('not found'));

    const user = userEvent.setup();

    renderWithProviders(
      <MemoryRouter initialEntries={['/pantry/visits']}>
        <PantryVisits />
      </MemoryRouter>,
    );

    const recordButton = await screen.findByRole('button', { name: /record visit/i });
    await user.click(recordButton);

    const dialog = await screen.findByRole('dialog', { name: /record visit/i });

    const clientIdField = within(dialog).getByLabelText(/client id/i);
    await user.type(clientIdField, '1234');

    const weightWithCartField = within(dialog).getByLabelText(/weight with cart/i);
    const weightWithoutCartField = within(dialog).getByLabelText(/weight without cart/i);
    await user.type(weightWithCartField, '50');
    await user.type(weightWithoutCartField, '45');

    const saveButton = within(dialog).getByRole('button', { name: /save/i });

    expect(
      await within(dialog).findByText(/client not present in database/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });

    const createButton = within(dialog).getByRole('button', { name: /create/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
  });
});

