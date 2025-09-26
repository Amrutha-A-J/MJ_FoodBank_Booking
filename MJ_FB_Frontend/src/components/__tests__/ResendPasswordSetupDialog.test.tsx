import ResendPasswordSetupDialog from '../ResendPasswordSetupDialog';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
} from '../../../testUtils/renderWithProviders';
import * as usersApi from '../../api/users';

jest.mock('../../api/users', () => ({
  resendPasswordSetup: jest.fn(),
}));

describe('ResendPasswordSetupDialog', () => {
  const resendPasswordSetupMock =
    usersApi.resendPasswordSetup as jest.MockedFunction<
      typeof usersApi.resendPasswordSetup
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows inline error when submitted with a blank identifier', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ResendPasswordSetupDialog open onClose={() => {}} />,
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();

    const form = submitButton.closest('form');
    expect(form).toBeTruthy();

    fireEvent.submit(form!);

    const inlineError = await screen.findByText(
      'Enter your email or client ID.',
    );
    expect(inlineError).toBeInTheDocument();
    expect(resendPasswordSetupMock).not.toHaveBeenCalled();

    const identifierField = screen.getByLabelText('Email or client ID');
    await user.type(identifierField, '   ');
    expect(submitButton).toBeDisabled();
    expect(
      screen.getByText('Enter your email or client ID.'),
    ).toBeInTheDocument();

    await user.type(identifierField, '{selectall}client@example.com');
    expect(submitButton).toBeEnabled();
    expect(
      screen.queryByText('Enter your email or client ID.'),
    ).not.toBeInTheDocument();
  });

  it('submits successfully and shows a confirmation message', async () => {
    const user = userEvent.setup();
    resendPasswordSetupMock.mockResolvedValue(undefined);

    renderWithProviders(
      <ResendPasswordSetupDialog open onClose={() => {}} />,
    );

    const identifierField = screen.getByLabelText('Email or client ID');

    await user.type(identifierField, '  client@example.com  ');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(resendPasswordSetupMock).toHaveBeenCalledWith({
        email: 'client@example.com',
      });
    });

    expect(
      await screen.findByText('Password setup link sent'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(identifierField).toHaveValue('');
    });
  });
});
