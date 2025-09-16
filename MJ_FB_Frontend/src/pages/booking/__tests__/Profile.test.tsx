import Profile from '../Profile';
import {
  renderWithProviders,
  screen,
  waitFor,
} from '../../../../testUtils/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as usersApi from '../../../api/users';

const actualUsersApi =
  jest.requireActual('../../../api/users') as typeof usersApi;

jest.mock('../../../api/users', () => {
  const actual = jest.requireActual('../../../api/users');
  return {
    ...actual,
    getUserProfile: jest.fn(),
    updateMyProfile: jest.fn(),
    getUserPreferences: jest.fn(),
  };
});

describe('Profile page', () => {
  afterEach(() => {
    (usersApi.getUserProfile as jest.Mock).mockReset();
    (usersApi.getUserProfile as jest.Mock).mockImplementation(
      actualUsersApi.getUserProfile,
    );
    (usersApi.updateMyProfile as jest.Mock).mockReset();
    (usersApi.updateMyProfile as jest.Mock).mockImplementation(
      actualUsersApi.updateMyProfile,
    );
    (usersApi.getUserPreferences as jest.Mock).mockReset();
    (usersApi.getUserPreferences as jest.Mock).mockImplementation(
      actualUsersApi.getUserPreferences,
    );
  });

  it('allows editing the address and saves changes', async () => {
    const mockGetUserProfile =
      usersApi.getUserProfile as jest.MockedFunction<
        typeof actualUsersApi.getUserProfile
      >;
    const mockUpdateMyProfile =
      usersApi.updateMyProfile as jest.MockedFunction<
        typeof actualUsersApi.updateMyProfile
      >;
    const mockGetUserPreferences =
      usersApi.getUserPreferences as jest.MockedFunction<
        typeof actualUsersApi.getUserPreferences
      >;

    mockGetUserProfile.mockResolvedValue({
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '123-456-7890',
      address: '123 Main St',
      role: 'shopper',
      clientId: 42,
    });
    mockGetUserPreferences.mockResolvedValue({ emailReminders: true });
    mockUpdateMyProfile.mockResolvedValue({
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '123-456-7890',
      address: '456 New Rd',
      role: 'shopper',
      clientId: 42,
    });

    const user = userEvent.setup();
    renderWithProviders(
      <MemoryRouter>
        <Profile role="shopper" />
      </MemoryRouter>,
    );

    expect(
      await screen.findByDisplayValue('test@example.com'),
    ).toBeInTheDocument();
    const addressField = (await screen.findByLabelText('Address')) as HTMLInputElement;
    expect(addressField).toHaveValue('123 Main St');
    expect(addressField).toBeDisabled();

    const editButton = screen.getByRole('button', { name: /edit profile/i });
    await user.click(editButton);
    expect(addressField).not.toBeDisabled();

    await user.clear(addressField);
    await user.type(addressField, '456 New Rd');

    await user.click(editButton);

    await waitFor(() =>
      expect(mockUpdateMyProfile).toHaveBeenCalledWith({
        email: 'test@example.com',
        phone: '123-456-7890',
        address: '456 New Rd',
      }),
    );

    await waitFor(() => expect(addressField).toBeDisabled());
    expect(addressField).toHaveValue('456 New Rd');
  });
});
