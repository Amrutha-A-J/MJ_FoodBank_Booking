import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { loginAgency } from '../api/users';
import { AuthProvider } from '../hooks/useAuth';

jest.mock('../api/users', () => ({
  loginAgency: jest.fn(),
}));

jest.mock('../pages/agency/AgencySchedule', () => () => <div>AgencySchedule</div>);
jest.mock('../pages/agency/ClientList', () => () => <div>AgencyClientList</div>);
jest.mock('../pages/agency/ClientBookings', () => () => <div>AgencyClientBookings</div>);

describe('Agency UI access', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('allows agency login and shows agency links', async () => {
    (loginAgency as jest.Mock).mockResolvedValue({
      role: 'agency',
      name: 'Agency',
      id: 1,
    });
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText(/agency login/i));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /schedule/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('link', { name: /clients/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated users away from agency routes', async () => {
    window.history.pushState({}, '', '/agency/schedule');
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    await waitFor(() => expect(window.location.pathname).toBe('/login/user'));
    expect(screen.getByText(/client login/i)).toBeInTheDocument();
  });
});
