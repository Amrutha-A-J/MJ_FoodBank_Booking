import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PasswordSetup from '../pages/auth/PasswordSetup';
import { setPassword, resendPasswordSetup } from '../api/users';

jest.mock('../api/users', () => ({
  setPassword: jest.fn(),
  resendPasswordSetup: jest.fn(),
}));

describe('PasswordSetup', () => {
  it('submits password with token from query', async () => {
    (setPassword as jest.Mock).mockResolvedValue(undefined);
    render(
      <MemoryRouter initialEntries={["/set-password?token=abc123"]}>
        <Routes>
          <Route path="/set-password" element={<PasswordSetup />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Passw0rd!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /set password/i }));
    await waitFor(() => expect(setPassword).toHaveBeenCalledWith('abc123', 'Passw0rd!'));
    await waitFor(() => expect(screen.getByText(/password set/i)).toBeInTheDocument());
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
    fireEvent.change(screen.getByLabelText(/password/i), {
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
