import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../hooks/useAuth';

const realFetch = global.fetch;

describe('AuthProvider refresh handling', () => {
  beforeEach(() => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test');
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network'));
  });

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('clears auth and shows message when refresh fails', async () => {
    render(
      <AuthProvider>
        <div />
      </AuthProvider>,
    );

    await waitFor(() => expect(localStorage.getItem('role')).toBeNull());
    expect(await screen.findByText('Session expired')).toBeInTheDocument();
  });

  it('retains auth when refresh returns 409', async () => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 409 });

    function Child() {
      const { token, ready } = useAuth();
      return <div>{ready ? token : ''}</div>;
    }

    render(
      <AuthProvider>
        <Child />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('cookie')).toBeInTheDocument());
    expect(localStorage.getItem('role')).toBe('staff');
  });
});

describe('AuthProvider with no prior session', () => {
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('does not show session expired when refresh fails without auth', async () => {
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 401 });

    render(
      <AuthProvider>
        <div />
      </AuthProvider>,
    );

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());
    expect(screen.queryByText('Session expired')).toBeNull();
  });
});
