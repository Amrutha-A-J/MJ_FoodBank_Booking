import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { APPRECIATION_MESSAGES } from '../utils/appreciationMessages';

jest.mock('../api/client', () => ({
  API_BASE: '',
  apiFetch: jest.fn(),
}));

const { apiFetch } = require('../api/client');

function Trigger() {
  const { login } = useAuth();
  return (
    <button onClick={() => login({ role: 'staff', name: 'Tester', access: [] })}>Login</button>
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

  it('shows appreciation message and card link', async () => {
    render(
      <AuthProvider>
        <Trigger />
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
});
