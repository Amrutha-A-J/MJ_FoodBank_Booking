import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PasswordSetup from '../pages/auth/PasswordSetup';
import { setPassword } from '../api/users';

jest.mock('../api/users', () => ({
  setPassword: jest.fn(),
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
});
