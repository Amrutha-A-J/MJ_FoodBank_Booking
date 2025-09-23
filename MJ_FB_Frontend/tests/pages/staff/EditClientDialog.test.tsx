import { waitFor } from '@testing-library/react';
import EditClientDialog from '../../../src/pages/staff/client-management/EditClientDialog';
import {
  renderWithProviders,
  screen,
} from '../../../testUtils/renderWithProviders';
import { getUserByClientId } from '../../../src/api/users';

jest.mock('../../../src/api/users', () => ({
  getUserByClientId: jest.fn(),
  updateUserInfo: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

const getUserByClientIdMock = getUserByClientId as jest.MockedFunction<
  typeof getUserByClientId
>;

describe('EditClientDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserByClientIdMock.mockResolvedValue({
      firstName: 'Focus',
      lastName: 'Client',
      email: 'focus.client@example.com',
      phone: '555-1111',
      onlineAccess: true,
      hasPassword: true,
    } as any);
  });

  it('focuses the first name field when opening the dialog', async () => {
    renderWithProviders(
      <EditClientDialog
        open
        clientId={123}
        onClose={jest.fn()}
        onUpdated={jest.fn()}
        onClientUpdated={jest.fn()}
      />,
    );

    await screen.findByLabelText(/first name/i);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toHaveFocus();
    });
  });
});

