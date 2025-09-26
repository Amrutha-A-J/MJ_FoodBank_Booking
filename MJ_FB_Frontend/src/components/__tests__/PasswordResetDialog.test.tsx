import PasswordResetDialog from '../PasswordResetDialog';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from '../../../testUtils/renderWithProviders';
import * as usersApi from '../../api/users';

jest.mock('../../api/users', () => ({
  requestPasswordReset: jest.fn(),
}));

describe('PasswordResetDialog', () => {
  const requestPasswordResetMock =
    usersApi.requestPasswordReset as jest.MockedFunction<
      typeof usersApi.requestPasswordReset
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows inline error when submitted with a blank identifier', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PasswordResetDialog open onClose={() => {}} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();

    const form = submitButton.closest('form');
    expect(form).toBeTruthy();

    fireEvent.submit(form!);

    const inlineError = await screen.findByText(
      'Enter your email or client ID.',
    );
    expect(inlineError).toBeInTheDocument();
    expect(requestPasswordResetMock).not.toHaveBeenCalled();

    const identifierField = screen.getByLabelText('Email or client ID');
    await user.type(identifierField, '   ');
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Enter your email or client ID.')).toBeInTheDocument();

    await user.type(identifierField, '{selectall}client@example.com');
    expect(submitButton).toBeEnabled();
    expect(
      screen.queryByText('Enter your email or client ID.'),
    ).not.toBeInTheDocument();
  });

  it('submits an email address and shows the confirmation message', async () => {
    const user = userEvent.setup();
    requestPasswordResetMock.mockResolvedValue(undefined);

    renderWithProviders(<PasswordResetDialog open onClose={() => {}} />);

    const identifierField = screen.getByLabelText('Email or client ID');
    await user.type(identifierField, '  client@example.com  ');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledWith({
        email: 'client@example.com',
      });
    });

    expect(
      await screen.findByText('If an account exists, a reset link has been sent.'),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(identifierField).toHaveValue('');
    });
  });

  it('submits a client ID', async () => {
    const user = userEvent.setup();
    requestPasswordResetMock.mockResolvedValue(undefined);

    renderWithProviders(<PasswordResetDialog open onClose={() => {}} />);

    const identifierField = screen.getByLabelText('Email or client ID');
    await user.type(identifierField, '  12345  ');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledWith({
        clientId: '12345',
      });
    });
  });
});

