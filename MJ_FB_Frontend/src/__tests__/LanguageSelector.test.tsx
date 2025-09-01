import { render, screen } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../hooks/useAuth';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import i18n from '../i18n';

describe('Language selector visibility', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = mockFetch();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });
    localStorage.clear();
  });

  afterEach(() => {
    restoreFetch();
    jest.resetAllMocks();
  });

  it('shows language selector on login page', () => {
    fetchMock.mockResolvedValue({
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
    expect(screen.getByText(i18n.t('english'))).toBeInTheDocument();
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
    expect(screen.getByText(i18n.t('english'))).toBeInTheDocument();
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
    expect(screen.queryByText(i18n.t('english'))).not.toBeInTheDocument();
  });
});
