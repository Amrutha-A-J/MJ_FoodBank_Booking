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
});
