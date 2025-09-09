import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/auth/Login';
import { login, resendPasswordSetup } from '../api/users';
import { verifyWebAuthn } from '../api/webauthn';

jest.mock('../api/users', () => ({
  login: jest.fn(),
  resendPasswordSetup: jest.fn(),
}));

jest.mock('../api/webauthn', () => ({
  verifyWebAuthn: jest.fn(),
  registerWebAuthnCredential: jest.fn(),
}));

describe('Login component', () => {
  it('submits login credentials and calls onLogin', async () => {
    (login as jest.Mock).mockResolvedValue({
      role: 'shopper',
      name: 'Test',
    });
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/client id or email/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(onLogin).toHaveBeenCalled());
  });

  it('shows friendly message on unauthorized error', async () => {
    const apiErr = Object.assign(new Error('backend'), { status: 401 });
    (login as jest.Mock).mockRejectedValue(apiErr);
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/client id or email/i), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(
      await screen.findByText('Incorrect ID or email or password')
    ).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('opens resend dialog on expired token error', async () => {
    const apiErr = Object.assign(new Error('expired'), { status: 403 });
    (login as jest.Mock).mockRejectedValue(apiErr);
    (resendPasswordSetup as jest.Mock).mockResolvedValue(undefined);
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/client id or email/i), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
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

  it('logs in with biometrics', async () => {
    (verifyWebAuthn as jest.Mock).mockResolvedValue({ role: 'shopper', name: 'Bio', id: 1 });
    (navigator as any).credentials = {
      get: jest.fn().mockResolvedValue({ id: 'cred' }),
      create: jest.fn(),
    };
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole('button', { name: /use biometrics/i }));
    await waitFor(() => expect(onLogin).toHaveBeenCalled());
  });

});
