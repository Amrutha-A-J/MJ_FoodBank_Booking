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
    localStorage.setItem('clientLoginNoticeCount', '3');
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

  it('refocuses identifier after failed login', async () => {
    localStorage.setItem('clientLoginNoticeCount', '3');
    (login as jest.Mock).mockRejectedValue({ status: 401, message: 'Unauthorized' });
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/client id or email/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(login).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText(/client id or email/i)).toHaveFocus());
  });
});
