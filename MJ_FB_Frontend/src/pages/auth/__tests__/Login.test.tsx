import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import { login } from '../../../api/users';

jest.mock('../../../api/users', () => ({
  ...jest.requireActual('../../../api/users'),
  login: jest.fn(),
}));

describe('Login error handling', () => {
  it('shows account not found message', async () => {
    (login as jest.Mock).mockRejectedValue({ status: 404, message: 'Account not found' });
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/client id or email/i), { target: { value: 'missing@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(screen.getByText(/don’t have an account/i)).toBeInTheDocument();
    });
  });

  it('disables button while submitting and refocuses identifier on error', async () => {
    (login as jest.Mock).mockRejectedValue({ status: 401, message: 'Incorrect' });
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>,
    );
    const idField = screen.getByLabelText(/client id or email/i);
    const button = screen.getByRole('button', { name: /login/i });
    expect(idField).toHaveFocus();
    fireEvent.change(idField, { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'secret' },
    });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(idField).toHaveFocus();
  });
});
