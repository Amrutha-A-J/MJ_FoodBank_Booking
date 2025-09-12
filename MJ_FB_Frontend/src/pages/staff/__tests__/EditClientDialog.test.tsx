import { screen, fireEvent } from '@testing-library/react';
import EditClientDialog from '../client-management/EditClientDialog';
import { getUserByClientId } from '../../../api/users';
import { renderWithProviders } from '../../../../testUtils/renderWithProviders';

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

    const toggle = await screen.findByRole('checkbox', { name: /online access/i });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });
});

