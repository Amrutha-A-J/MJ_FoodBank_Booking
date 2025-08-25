import { render, screen } from '@testing-library/react';
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

  it('keeps user logged in when token exists', () => {
    localStorage.setItem('token', 'testtoken');
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
    localStorage.setItem('token', 'testtoken');
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
    localStorage.setItem('token', 'testtoken');
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
    localStorage.setItem('token', 'testtoken');
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
});
