import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/auth/Login';
import { login, resendPasswordSetup } from '../api/users';
import * as mui from '@mui/material';

jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: jest.fn().mockReturnValue(false),
  };
});

jest.mock('../api/users', () => ({
  login: jest.fn(),
  resendPasswordSetup: jest.fn(),
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

  it('shows message on incorrect credentials', async () => {
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
    expect(await screen.findByText('Password is incorrect.')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('opens resend dialog when password setup link expired', async () => {
    const apiErr = Object.assign(new Error('expired'), { status: 410 });
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

  it('hides biometrics button on desktop', () => {
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );
    expect(
      screen.queryByRole('button', { name: /use biometrics/i })
    ).toBeNull();
  });

  it('does not show biometrics button on small screens when unsupported', () => {
    (mui.useMediaQuery as jest.Mock).mockReturnValue(true);
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );
    expect(
      screen.queryByRole('button', { name: /use biometrics/i })
    ).toBeNull();
    (mui.useMediaQuery as jest.Mock).mockReturnValue(false);
  });

  it('links to the privacy policy', () => {
    const onLogin = jest.fn().mockResolvedValue('/');
    render(
      <MemoryRouter>
        <Login onLogin={onLogin} />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toHaveAttribute('href', '/privacy');
  });

});
