import { screen, waitFor } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { renderWithProviders } from '../../testUtils/renderWithProviders';

describe('AuthProvider refresh handling', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = mockFetch();
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test');
    fetchMock.mockRejectedValue(new Error('network'));
  });

  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('clears auth and shows message when refresh fails', async () => {
    renderWithProviders(<div />);

    await waitFor(() => expect(localStorage.getItem('role')).toBeNull());
    expect(await screen.findByText('Session expired')).toBeInTheDocument();
  });

  it('retains auth when refresh returns 409', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409 });

    function Child() {
      const { isAuthenticated, ready } = useAuth();
      return <div>{ready ? String(isAuthenticated) : ''}</div>;
    }

    renderWithProviders(<Child />);

    await waitFor(() => expect(screen.getByText('true')).toBeInTheDocument());
    expect(localStorage.getItem('role')).toBe('staff');
  });
});

describe('AuthProvider with no prior session', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = mockFetch();
  });

  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('does not show session expired when refresh fails without auth', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    renderWithProviders(<div />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText('Session expired')).toBeNull();
  });

  it('does not authenticate when refresh succeeds without auth', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    function Child() {
      const { isAuthenticated, ready } = useAuth();
      return <div>{ready ? String(isAuthenticated) : ''}</div>;
    }

    renderWithProviders(<Child />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText('true')).toBeNull();
  });
});
