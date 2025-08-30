import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/auth/Login';
import { loginUser, resendPasswordSetup } from '../api/users';

jest.mock('../api/users', () => ({
  loginUser: jest.fn(),
  resendPasswordSetup: jest.fn(),
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

  it('shows friendly message on unauthorized error', async () => {
    const apiErr = Object.assign(new Error('backend'), { status: 401 });
    (loginUser as jest.Mock).mockRejectedValue(apiErr);
    const onLogin = jest.fn();
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/client id/i), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(
      await screen.findByText('Incorrect ID or password')
    ).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('opens resend dialog on expired token error', async () => {
    const apiErr = Object.assign(new Error('expired'), { status: 403 });
    (loginUser as jest.Mock).mockRejectedValue(apiErr);
    (resendPasswordSetup as jest.Mock).mockResolvedValue(undefined);
    const onLogin = jest.fn();
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/client id/i), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(
      await screen.findByText('Password setup link expired')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText(/email or client id/i)).toBeInTheDocument(),
    );
  });

});
