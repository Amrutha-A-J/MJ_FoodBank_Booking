import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/auth/Login';
import { loginUser } from '../api/users';

jest.mock('../api/users', () => ({
  loginUser: jest.fn(),
}));

describe('Login component', () => {
  it('submits login credentials and calls onLogin', async () => {
    (loginUser as jest.Mock).mockResolvedValue({
      role: 'user',
      name: 'Test',
    });
    const onLogin = jest.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(onLogin).toHaveBeenCalled());
  });

  it('includes link to signup', () => {
    render(
      <MemoryRouter>
        <Login onLogin={async () => {}} />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /sign up/i });
    expect(link).toHaveAttribute('href', '/signup');
  });
});
