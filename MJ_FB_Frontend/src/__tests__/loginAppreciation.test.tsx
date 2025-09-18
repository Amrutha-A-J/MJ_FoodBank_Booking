import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
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

describe('login feedback', () => {
  beforeEach(() => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ cardUrl: '/card.pdf' }) });
  });

  afterEach(() => {
    (apiFetch as jest.Mock).mockReset();
    localStorage.clear();
  });

function CardProbe() {
  const { cardUrl } = useAuth();
  if (!cardUrl) return null;
  return (
    <a href={cardUrl} download>
      Download volunteer card
    </a>
  );
}

  it('shows volunteer card link without triggering snackbar for volunteers', async () => {
    renderWithProviders(
      <>
        <Trigger role="volunteer" />
        <CardProbe />
      </>,
    );
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    (apiFetch as jest.Mock).mockClear();
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    const link = await screen.findByRole('link', { name: /download volunteer card/i });
    expect(link).toHaveAttribute('href', '/card.pdf');
    expect(link).toHaveAttribute('download');
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  it('does not show appreciation message for staff', async () => {
    renderWithProviders(<Trigger role="staff" />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    (apiFetch as jest.Mock).mockClear();
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});
