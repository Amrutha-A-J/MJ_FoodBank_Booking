import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen } from '../../../../testUtils/renderWithProviders';
import AccountEditForm from '../AccountEditForm';

describe('AccountEditForm', () => {
  it('shows account and contact fields without expanding any sections', () => {
    const handleSave = jest.fn();

    renderWithProviders(
      <AccountEditForm
        open
        initialData={{
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          phone: '555-1234',
          onlineAccess: true,
          password: 'Secret!23',
          hasPassword: false,
        }}
        onSave={handleSave}
      />,
    );

    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Online Access')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone (optional)')).toBeInTheDocument();
  });

  it('allows setting a new password for users with an existing account', () => {
    const handleSave = jest.fn();

    renderWithProviders(
      <AccountEditForm
        open
        initialData={{
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          phone: '555-1234',
          onlineAccess: true,
          password: '',
          hasPassword: true,
        }}
        onSave={handleSave}
      />,
    );

    const toggle = screen.getByTestId('online-access-toggle');
    expect(toggle).not.toBeDisabled();

    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('set-password-button'));

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'Secret!23' } });

    fireEvent.click(screen.getByTestId('save-button'));

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'Secret!23' }),
    );
  });

  it('allows toggling online access when the user already has a password', () => {
    const handleSave = jest.fn();

    renderWithProviders(
      <AccountEditForm
        open
        initialData={{
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          phone: '555-1234',
          onlineAccess: true,
          password: '',
          hasPassword: true,
        }}
        onSave={handleSave}
      />,
    );

    const toggle = screen.getByTestId('online-access-toggle');
    fireEvent.click(toggle);

    fireEvent.click(screen.getByTestId('save-button'));

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({ onlineAccess: false }),
    );
  });
});
