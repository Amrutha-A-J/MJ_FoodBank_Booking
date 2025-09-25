import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UpdateClientData from '../pages/staff/client-management/UpdateClientData';
import {
  getIncompleteUsers,
  updateUserInfo,
  getUserByClientId,
  requestPasswordReset,
} from '../api/users';

jest.mock('../api/users', () => ({
  getIncompleteUsers: jest.fn(),
  updateUserInfo: jest.fn(),
  getUserByClientId: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

beforeEach(() => {
  (getIncompleteUsers as jest.Mock).mockResolvedValue([
    {
      clientId: 1,
      firstName: 'Jane',
      lastName: 'Doe',
      email: '',
      phone: '',
      profileLink: 'link',
    },
  ]);
  (updateUserInfo as jest.Mock).mockResolvedValue(undefined);
  (getUserByClientId as jest.Mock).mockResolvedValue({
    firstName: 'Jane',
    lastName: 'Doe',
    email: '',
    phone: '',
    onlineAccess: false,
    hasPassword: false,
    role: 'shopper',
  });
  (requestPasswordReset as jest.Mock).mockResolvedValue(undefined);
});

describe('UpdateClientData', () => {
  it('shows server error message when update fails', async () => {
    (updateUserInfo as jest.Mock).mockRejectedValueOnce({
      message: 'Unable to update client',
      details: { errors: [{ message: 'Email already exists.' }] },
    });
    render(<UpdateClientData />);

    const editBtn = await screen.findByRole('button', { name: 'Edit' });
    await act(async () => {
      fireEvent.click(editBtn);
    });
    await screen.findByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() =>
      expect(
        screen.getByText('Email already exists.')
      ).toBeInTheDocument()
    );
  });

  it('enables online access without password and sends reset link', async () => {
    render(<UpdateClientData />);

    const editBtn = await screen.findByRole('button', { name: 'Edit' });
    await act(async () => {
      fireEvent.click(editBtn);
    });
    const toggle = await screen.findByLabelText('Online Access');
    await act(async () => {
      fireEvent.click(toggle);
    });

    const saveBtn = screen.getByRole('button', { name: /^save$/i });
    expect(saveBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /send password reset link/i }),
      );
    });

    await waitFor(() =>
      expect(updateUserInfo).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ onlineAccess: true }),
      ),
    );
    expect(requestPasswordReset).toHaveBeenCalledWith({ clientId: '1' });
  });

  it('shows Set password control when client has an existing credential', async () => {
    (getUserByClientId as jest.Mock).mockResolvedValueOnce({
      firstName: 'Jane',
      lastName: 'Doe',
      email: '',
      phone: '',
      onlineAccess: true,
      hasPassword: true,
      role: 'shopper',
    });

    render(<UpdateClientData />);

    const editBtn = await screen.findByRole('button', { name: 'Edit' });
    await act(async () => {
      fireEvent.click(editBtn);
    });

    const checkbox = await screen.findByLabelText('Online Access');
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(screen.getByTestId('set-password-button')).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('set-password-button'));
    expect(await screen.findByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByTestId('online-badge')).toBeInTheDocument();
  });

  it('submits updated password for existing clients', async () => {
    (getUserByClientId as jest.Mock).mockResolvedValueOnce({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '',
      onlineAccess: true,
      hasPassword: true,
      role: 'shopper',
    });

    render(<UpdateClientData />);

    const editBtn = await screen.findByRole('button', { name: 'Edit' });
    await act(async () => {
      fireEvent.click(editBtn);
    });

    fireEvent.click(await screen.findByTestId('set-password-button'));
    fireEvent.change(await screen.findByLabelText('Password'), {
      target: { value: 'Secret!1' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });

    await waitFor(() =>
      expect(updateUserInfo).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ password: 'Secret!1' }),
      ),
    );
  });
});
