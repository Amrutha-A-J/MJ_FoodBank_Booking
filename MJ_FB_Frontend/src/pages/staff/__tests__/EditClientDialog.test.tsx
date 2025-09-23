import { screen, fireEvent, waitFor } from '@testing-library/react';
import { setTimeout as nodeSetTimeout, clearTimeout as nodeClearTimeout } from 'timers';
import EditClientDialog from '../client-management/EditClientDialog';
import { getUserByClientId, updateUserInfo } from '../../../api/users';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';

beforeAll(() => {
  // Ensure undici timers receive Node timeout objects with a refresh method
  global.setTimeout = nodeSetTimeout as any;
  global.clearTimeout = nodeClearTimeout as any;
});

jest.mock('../../../api/users', () => ({
  ...jest.requireActual('../../../api/users'),
  getUserByClientId: jest.fn(),
  updateUserInfo: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

describe('EditClientDialog', () => {
  beforeEach(() => {
    (getUserByClientId as jest.Mock).mockReset();
  });

  it('renders name and online badge when hasPassword is true', async () => {
    (getUserByClientId as jest.Mock).mockResolvedValue({
      firstName: 'John',
      lastName: 'Doe',
      email: '',
      phone: '',
      onlineAccess: true,
      hasPassword: true,
      role: 'shopper',
    });

    renderWithProviders(
      <EditClientDialog
        open
        clientId={1}
        onClose={() => {}}
        onUpdated={jest.fn()}
        onClientUpdated={jest.fn()}
      />,
    );

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByTestId('online-badge')).toBeInTheDocument();
  });

  it('online access switch toggles onlineAccess state', async () => {
    (getUserByClientId as jest.Mock).mockResolvedValue({
      firstName: 'Jane',
      lastName: 'Smith',
      email: '',
      phone: '',
      onlineAccess: false,
      hasPassword: false,
      role: 'shopper',
    });

    renderWithProviders(
      <EditClientDialog
        open
        clientId={1}
        onClose={() => {}}
        onUpdated={jest.fn()}
        onClientUpdated={jest.fn()}
      />,
    );

    const toggle = await screen.findByLabelText(/online access/i);
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });

  it('sends updated password when setting a new one for existing client', async () => {
    (getUserByClientId as jest.Mock).mockResolvedValue({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '',
      onlineAccess: true,
      hasPassword: true,
      role: 'shopper',
    });
    (updateUserInfo as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(
      <EditClientDialog
        open
        clientId={1}
        onClose={() => {}}
        onUpdated={jest.fn()}
        onClientUpdated={jest.fn()}
      />,
    );

    await screen.findByText('Jane Smith');
    fireEvent.click(screen.getByTestId('set-password-button'));
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'Secret!1' },
    });
    fireEvent.click(screen.getByTestId('save-button'));

    await waitFor(() =>
      expect(updateUserInfo).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ password: 'Secret!1' }),
      ),
    );
  });
});

