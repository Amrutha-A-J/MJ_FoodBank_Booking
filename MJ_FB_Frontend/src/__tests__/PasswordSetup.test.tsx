import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PasswordSetup from '../pages/auth/PasswordSetup';
import { setPassword, resendPasswordSetup } from '../api/users';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../api/users', () => ({
  setPassword: jest.fn(),
  resendPasswordSetup: jest.fn(),
}));

describe('PasswordSetup', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });
  it('submits password with token from query and redirects', async () => {
    (setPassword as jest.Mock).mockResolvedValue('/login/user');
    render(
      <MemoryRouter initialEntries={["/set-password?token=abc123"]}>
        <Routes>
          <Route path="/set-password" element={<PasswordSetup />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'Passw0rd!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    await waitFor(() => expect(setPassword).toHaveBeenCalledWith('abc123', 'Passw0rd!'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login/user'));
  });

  it('toggles password visibility', () => {
    render(
      <MemoryRouter initialEntries={["/set-password?token=abc123"]}>
        <Routes>
          <Route path="/set-password" element={<PasswordSetup />} />
        </Routes>
      </MemoryRouter>,
    );
    const input = screen.getByLabelText(/password/i, { selector: 'input' });
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByLabelText(/show password/i));
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByLabelText(/hide password/i));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows resend link dialog when token expired', async () => {
    (setPassword as jest.Mock).mockRejectedValue(new Error('Invalid or expired token'));
    (resendPasswordSetup as jest.Mock).mockResolvedValue(undefined);
    render(
      <MemoryRouter initialEntries={["/set-password?token=bad"]}>
        <Routes>
          <Route path="/set-password" element={<PasswordSetup />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
      target: { value: 'Passw0rd!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    await waitFor(() =>
      expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /resend link/i }));
    const input = await screen.findByLabelText(/email or client id/i);
    fireEvent.change(input, { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() =>
      expect(resendPasswordSetup).toHaveBeenCalledWith({ email: 'user@example.com' }),
    );
  });
});
