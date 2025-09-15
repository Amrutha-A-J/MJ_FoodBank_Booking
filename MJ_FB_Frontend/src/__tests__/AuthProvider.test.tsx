import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

jest.mock('../api/client', () => ({
  API_BASE: '',
  apiFetch: jest.fn(),
}));

jest.mock('../api/users', () => ({
  logout: jest.fn(),
}));

const { apiFetch } = require('../api/client');
const { logout: apiLogout } = require('../api/users');

function TestComponent() {
  const { login, logout, cardUrl } = useAuth();
  return (
    <div>
      <button onClick={() => login({ role: 'volunteer', name: 'Test', access: [] })}>
        login
      </button>
      <button onClick={() => logout()}>logout</button>
      <div data-testid="card">{cardUrl}</div>
    </div>
  );
}

describe('AuthProvider cardUrl cleanup', () => {
  afterEach(() => {
    (apiFetch as jest.Mock).mockReset();
    (apiLogout as jest.Mock).mockReset();
    localStorage.clear();
  });

  it('clears cardUrl on logout', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ cardUrl: '/card.pdf' }) });
    (apiLogout as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('login'));
    await waitFor(() =>
      expect(screen.getByTestId('card')).toHaveTextContent('/card.pdf'),
    );

    fireEvent.click(screen.getByText('logout'));
    await waitFor(() =>
      expect(screen.getByTestId('card')).toHaveTextContent(''),
    );
  });

  it('clears cardUrl when session ends in another tab', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ cardUrl: '/card.pdf' }) });
    (apiLogout as jest.Mock).mockResolvedValue(undefined);

    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('login'));
    await waitFor(() =>
      expect(screen.getByTestId('card')).toHaveTextContent('/card.pdf'),
    );

    localStorage.removeItem('role');
    window.dispatchEvent(new StorageEvent('storage', { key: 'role' }));

    await waitFor(() =>
      expect(screen.getByTestId('card')).toHaveTextContent(''),
    );
    expect(apiLogout).not.toHaveBeenCalled();
  });
});

