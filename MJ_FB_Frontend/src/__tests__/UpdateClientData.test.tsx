import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UpdateClientData from '../pages/staff/client-management/UpdateClientData';
import { updateUserInfo, requestPasswordReset } from '../api/users';

jest.mock('../api/users', () => ({
  getIncompleteUsers: jest.fn().mockResolvedValue([
    {
      clientId: 1,
      firstName: 'Jane',
      lastName: 'Doe',
      email: '',
      phone: '',
      profileLink: 'link',
    },
  ]),
  updateUserInfo: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

describe('UpdateClientData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows server error message when update fails', async () => {
    (updateUserInfo as jest.Mock).mockRejectedValue({
      message: 'Update failed',
      details: { errors: [{ message: 'Email already exists' }] },
    });

    render(<UpdateClientData />);

    await screen.findByRole('button', { name: 'Edit' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(
        screen.getByText('Email already exists')
      ).toBeInTheDocument()
    );
  });

  it('saves with password when provided', async () => {
    (updateUserInfo as jest.Mock).mockResolvedValue({});

    render(<UpdateClientData />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByLabelText('Online Access'));
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateUserInfo).toHaveBeenCalled());
    expect(updateUserInfo).toHaveBeenCalledWith(1, expect.objectContaining({
      password: 'Secret123!',
    }));
  });

  it('allows enabling online access without password', async () => {
    (updateUserInfo as jest.Mock).mockResolvedValue({});

    render(<UpdateClientData />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByLabelText('Online Access'));
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);

    await waitFor(() => expect(updateUserInfo).toHaveBeenCalled());
    expect((updateUserInfo as jest.Mock).mock.calls[0][1].password).toBeUndefined();
  });

  it('sends password reset link after saving', async () => {
    (updateUserInfo as jest.Mock).mockResolvedValue({});
    (requestPasswordReset as jest.Mock).mockResolvedValue(undefined);

    render(<UpdateClientData />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByLabelText('Online Access'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Send password reset link' }),
    );

    await waitFor(() => expect(updateUserInfo).toHaveBeenCalled());
    expect(requestPasswordReset).toHaveBeenCalledWith({ clientId: '1' });
  });
});
