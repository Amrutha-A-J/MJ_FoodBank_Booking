import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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
    window.sessionStorage.clear();
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
      bookingsThisMonth: 0,
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
    const toggle = await screen.findByLabelText(/online access/i);
    expect(toggle).toBeDisabled();
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
      bookingsThisMonth: 0,
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
      bookingsThisMonth: 0,
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

  it('keeps focus and values when parent rerenders with new callbacks', async () => {
    (getUserByClientId as jest.Mock).mockResolvedValue({
      firstName: 'Sam',
      lastName: 'Taylor',
      email: 'sam@example.com',
      phone: '3065551212',
      onlineAccess: true,
      hasPassword: true,
      role: 'shopper',
      bookingsThisMonth: 0,
    });

    const user = userEvent.setup();

    const handleClose = jest.fn();
    const handleClientUpdated = jest.fn();

    function Harness() {
      const [onUpdated, setOnUpdated] = useState(() => jest.fn());
      return (
        <>
          <EditClientDialog
            open
            clientId={5}
            onClose={handleClose}
            onUpdated={onUpdated}
            onClientUpdated={handleClientUpdated}
          />
          <button
            type="button"
            onClick={() => setOnUpdated(() => jest.fn())}
            data-testid="refresh-callback"
          >
            Refresh callback
          </button>
        </>
      );
    }

    renderWithProviders(<Harness />);

    const firstNameInput = await screen.findByTestId('first-name-input');
    fireEvent.change(firstNameInput, { target: { value: 'Samuel' } });
    await waitFor(() => expect(firstNameInput).toHaveValue('Samuel'));

    await user.click(screen.getByTestId('refresh-callback'));

    await waitFor(() => expect(getUserByClientId).toHaveBeenCalledTimes(1));
    expect(getUserByClientId).toHaveBeenCalledTimes(1);
  });

  it('restores unsaved edits after closing and reopening', async () => {
    (getUserByClientId as jest.Mock).mockResolvedValue({
      firstName: 'Riley',
      lastName: 'Johnson',
      email: 'riley@example.com',
      phone: '3065551000',
      onlineAccess: true,
      hasPassword: true,
      role: 'shopper',
      bookingsThisMonth: 0,
    });

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <EditClientDialog
            open={open}
            clientId={8}
            onClose={() => setOpen(false)}
            onUpdated={jest.fn()}
            onClientUpdated={jest.fn()}
          />
          <button type="button" data-testid="reopen" onClick={() => setOpen(true)}>
            Reopen
          </button>
        </>
      );
    }

    renderWithProviders(<Harness />);

    fireEvent.change(screen.getByTestId('phone-input'), {
      target: { value: '3065552020' },
    });

    await waitFor(() =>
      expect(window.sessionStorage.getItem('edit-client-8')).toContain('3065552020'),
    );

    fireEvent.click(screen.getByLabelText('close'));

    fireEvent.click(screen.getByTestId('reopen'));

    await waitFor(() =>
      expect(screen.getByTestId('phone-input')).toHaveValue('3065552020'),
    );
  });
});

