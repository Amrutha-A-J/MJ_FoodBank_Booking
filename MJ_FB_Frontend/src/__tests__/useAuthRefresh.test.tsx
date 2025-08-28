import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../hooks/useAuth';

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
});
