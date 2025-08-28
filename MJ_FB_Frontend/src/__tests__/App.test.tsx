import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../hooks/useAuth';

jest.mock('../pages/volunteer-management/VolunteerManagement', () => () => (
  <div>VolunteerManagement</div>
));
jest.mock('../pages/warehouse-management/WarehouseDashboard', () => () => (
  <div>WarehouseDashboard</div>
));

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn().mockResolvedValue([]),
  getSlots: jest.fn().mockResolvedValue([]),
  getHolidays: jest.fn().mockResolvedValue([]),
}));

describe('App authentication persistence', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('shows login when not authenticated', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(screen.getByText(/user login/i)).toBeInTheDocument();
  });

  it('keeps user logged in when role exists', () => {
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Test User');
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(screen.queryByText(/user login/i)).not.toBeInTheDocument();
  });

  it('redirects staff with only pantry access to pantry dashboard', () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['pantry']));
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(window.location.pathname).toBe('/pantry');
  });

  it('redirects staff with only volunteer management access', () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['volunteer_management']));
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(window.location.pathname).toBe('/volunteer-management');
  });

  it('redirects staff with only warehouse access', () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['warehouse']));
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(window.location.pathname).toBe('/warehouse-management');
  });

  it('renders signup page when visiting /signup', () => {
    window.history.pushState({}, '', '/signup');
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(screen.getByText(/client sign up/i)).toBeInTheDocument();
  });

  it('shows App Config link for admin staff', () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Admin User');
    localStorage.setItem('access', JSON.stringify(['admin']));
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    const adminButton = screen.getByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);
    expect(screen.getByRole('menuitem', { name: 'App Config' })).toBeInTheDocument();
  });
});
