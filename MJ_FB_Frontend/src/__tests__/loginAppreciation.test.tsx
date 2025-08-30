import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { APPRECIATION_MESSAGES } from '../utils/appreciationMessages';
import type { Role } from '../types';

jest.mock('../api/client', () => ({
  API_BASE: '',
  apiFetch: jest.fn(),
}));

const { apiFetch } = require('../api/client');

function Trigger({ role }: { role: Role }) {
  const { login } = useAuth();
  return (
    <button onClick={() => login({ role, name: 'Tester', access: [] })}>Login</button>
  );
}

describe('appreciation message on login', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ cardUrl: '/card.pdf' }) });
  });

  afterEach(() => {
    (apiFetch as jest.Mock).mockReset();
    localStorage.clear();
  });

  it('shows appreciation message and card link for volunteers', async () => {
    render(
      <AuthProvider>
        <Trigger role="volunteer" />
      </AuthProvider>
    );
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(
      await screen.findByText(content => APPRECIATION_MESSAGES.includes(content))
    ).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /download card/i });
    expect(link).toHaveAttribute('href', '/card.pdf');
  });

  it('does not show appreciation message for staff', async () => {
    render(
      <AuthProvider>
        <Trigger role="staff" />
      </AuthProvider>
    );
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(
      screen.queryByText(content => APPRECIATION_MESSAGES.includes(content))
    ).toBeNull();
  });
});
