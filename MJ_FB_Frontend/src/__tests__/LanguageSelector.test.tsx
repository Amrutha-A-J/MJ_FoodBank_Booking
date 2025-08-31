import { render, screen } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../hooks/useAuth';

describe('Language selector visibility', () => {
  const originalFetch = (global as any).fetch;

  beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });
    localStorage.clear();
  });

  afterEach(() => {
    if (originalFetch) {
      (global as any).fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
  });

  it('shows language selector on login page', () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
      headers: new Headers(),
    });
    window.history.pushState({}, '', '/login/user');
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(screen.getByText(/english/i)).toBeInTheDocument();
  });

  it('shows language selector on client dashboard', () => {
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Test User');
    window.history.pushState({}, '', '/');
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(screen.getByText(/english/i)).toBeInTheDocument();
  });

  it('hides language selector on staff dashboard', () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Staff User');
    localStorage.setItem('access', JSON.stringify(['pantry']));
    window.history.pushState({}, '', '/pantry');
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(screen.queryByText(/english/i)).not.toBeInTheDocument();
  });
});
