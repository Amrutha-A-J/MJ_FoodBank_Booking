import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../hooks/useAuth';

const originalFetch = (global as any).fetch;

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

  afterEach(() => {
    if (originalFetch) {
      (global as any).fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
  });

  it('shows login when not authenticated', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
      headers: new Headers(),
    });
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(await screen.findByText(/client login/i)).toBeInTheDocument();
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

  it('shows set password even when already logged in', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    window.history.pushState({}, '', '/set-password?token=abc');
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    const els = await screen.findAllByText(/set password/i);
    expect(els.length).toBeGreaterThan(0);
  });

  it('redirects staff with only pantry access to pantry dashboard', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['pantry']));
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    await waitFor(() => expect(window.location.pathname).toBe('/pantry'));
  });


  it('redirects staff with only volunteer management access', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['volunteer_management']));
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    await waitFor(() => expect(window.location.pathname).toBe('/volunteer-management'));
  });

  it('redirects staff with only warehouse access', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['warehouse']));
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    await waitFor(() => expect(window.location.pathname).toBe('/warehouse-management'));
  });

  it('shows admin links for admin staff', () => {
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
    expect(
      screen.getByRole('menuitem', { name: 'App Config' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Warehouse Settings' }),
    ).toBeInTheDocument();
  });
});
