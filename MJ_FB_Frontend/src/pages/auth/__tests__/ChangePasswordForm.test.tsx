import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChangePasswordForm from '../ChangePasswordForm';
import { changePassword } from '../../../api/users';

jest.mock('../../../api/users', () => ({
  ...jest.requireActual('../../../api/users'),
  changePassword: jest.fn(),
}));

const mockedChangePassword = changePassword as jest.MockedFunction<typeof changePassword>;

function renderForm() {
  render(
    <MemoryRouter>
      <ChangePasswordForm />
    </MemoryRouter>,
  );
}

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedChangePassword.mockResolvedValue(undefined);
  });

  it('disables submission until the current password and new password are valid', () => {
    renderForm();

    const submitButton = screen.getByRole('button', { name: /reset password/i });
    const currentPasswordField = screen.getByLabelText(/current password/i, { selector: 'input' });
    const newPasswordField = screen.getByLabelText(/new password/i, { selector: 'input' });

    expect(submitButton).toBeDisabled();

    fireEvent.change(currentPasswordField, { target: { value: 'Current1!' } });
    expect(submitButton).toBeDisabled();

    fireEvent.change(newPasswordField, { target: { value: 'short' } });
    expect(submitButton).toBeDisabled();

    fireEvent.change(newPasswordField, { target: { value: 'ValidPass!' } });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows inline errors when validation fails', () => {
    renderForm();

    const currentPasswordField = screen.getByLabelText(/current password/i, { selector: 'input' });
    const newPasswordField = screen.getByLabelText(/new password/i, { selector: 'input' });

    fireEvent.focus(currentPasswordField);
    fireEvent.blur(currentPasswordField);
    expect(screen.getByText(/enter your current password/i)).toBeInTheDocument();

    fireEvent.focus(newPasswordField);
    fireEvent.blur(newPasswordField);
    expect(screen.getByText(/enter a new password/i)).toBeInTheDocument();

    fireEvent.change(currentPasswordField, { target: { value: 'Current1!' } });
    fireEvent.change(newPasswordField, { target: { value: 'alllower!' } });
    fireEvent.blur(newPasswordField);

    expect(screen.getByText(/password must include uppercase and lowercase letters/i)).toBeInTheDocument();
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it('submits successfully when all rules are met', async () => {
    renderForm();

    const currentPasswordField = screen.getByLabelText(/current password/i, { selector: 'input' });
    const newPasswordField = screen.getByLabelText(/new password/i, { selector: 'input' });
    const submitButton = screen.getByRole('button', { name: /reset password/i });

    fireEvent.change(currentPasswordField, { target: { value: 'Current1!' } });
    fireEvent.change(newPasswordField, { target: { value: 'ValidPass!' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedChangePassword).toHaveBeenCalledWith('Current1!', 'ValidPass!');
    });

    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
    expect(currentPasswordField).toHaveValue('');
    expect(newPasswordField).toHaveValue('');
  });
});
