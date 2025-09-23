import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditClientDialog from '../pages/staff/client-management/EditClientDialog';
import { getUserByClientId, updateUserInfo } from '../api/users';

jest.mock('../api/users', () => ({
  getUserByClientId: jest.fn(),
  updateUserInfo: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

describe('EditClientDialog', () => {
  const props = {
    open: true,
    clientId: 1,
    onClose: jest.fn(),
    onUpdated: jest.fn(),
    onClientUpdated: jest.fn(),
  };

  it('shows online account badge when client has password', async () => {
    (getUserByClientId as jest.Mock).mockResolvedValueOnce({
      firstName: 'John',
      lastName: 'Smith',
      email: '',
      phone: '',
      onlineAccess: true,
      hasPassword: true,
      role: 'shopper',
    });

    render(<EditClientDialog {...props} />);
    await screen.findByText('John Smith');
    expect(screen.getByTestId('online-badge')).toBeInTheDocument();
  });

  it('does not show online account badge when client lacks password', async () => {
    (getUserByClientId as jest.Mock).mockResolvedValueOnce({
      firstName: 'John',
      lastName: 'Smith',
      email: '',
      phone: '',
      onlineAccess: false,
      hasPassword: false,
      role: 'shopper',
    });

    render(<EditClientDialog {...props} />);
    await screen.findByText('John Smith');
    expect(screen.queryByTestId('online-badge')).not.toBeInTheDocument();
  });

  it('allows setting a new password when client already has one', async () => {
    (getUserByClientId as jest.Mock).mockResolvedValueOnce({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      phone: '',
      onlineAccess: true,
      hasPassword: true,
      role: 'shopper',
    });
    (updateUserInfo as jest.Mock).mockResolvedValueOnce(undefined);

    render(<EditClientDialog {...props} />);

    await screen.findByText('John Smith');

    fireEvent.click(screen.getByTestId('set-password-button'));
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'Secret!1' },
    });
    fireEvent.click(screen.getByTestId('save-button'));

    await waitFor(() =>
      expect(updateUserInfo).toHaveBeenCalledWith(
        props.clientId,
        expect.objectContaining({ password: 'Secret!1' }),
      ),
    );
  });
});
