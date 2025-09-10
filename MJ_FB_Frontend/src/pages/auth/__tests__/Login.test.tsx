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
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => {
      expect(screen.getByText(/don’t have an account/i)).toBeInTheDocument();
    });
  });
});
