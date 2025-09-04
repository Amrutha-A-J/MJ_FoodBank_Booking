import { screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import * as volunteerApi from '../api/volunteers';

let fetchMock: jest.Mock;

jest.mock('../pages/volunteer-management/VolunteerManagement', () => {
  const mod = { __esModule: true, default: () => <div>VolunteerManagement</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});
jest.mock('../pages/volunteer-management/VolunteerTabs', () => {
  const mod = { __esModule: true, default: () => <div>VolunteerTabs</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});
jest.mock('../pages/warehouse-management/WarehouseDashboard', () => {
  const mod = { __esModule: true, default: () => <div>WarehouseDashboard</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});
jest.mock('../pages/help/HelpPage', () => {
  const mod = { __esModule: true, default: () => <div>HelpPage</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});

jest.mock('../api/bookings.ts', () => ({
  __esModule: true,
  getBookingHistory: jest.fn().mockResolvedValue([]),
  getSlots: jest.fn().mockResolvedValue([]),
  getHolidays: jest.fn().mockResolvedValue([]),
  getBookings: jest.fn().mockResolvedValue([]),
  getEvents: jest.fn().mockResolvedValue([]),
  getSlotsRange: jest.fn().mockResolvedValue([]),
}));
jest.spyOn(volunteerApi, 'getVolunteerBookingsForReview').mockResolvedValue([]);

describe('App authentication persistence', () => {
  beforeEach(() => {
    fetchMock = mockFetch();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });
    jest.spyOn(volunteerApi, 'getVolunteerBookingsForReview').mockResolvedValue([]);
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    restoreFetch();
    jest.resetAllMocks();
  });

  it('shows login when not authenticated', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
      headers: new Headers(),
    });
    renderWithProviders(<App />);
    expect(await screen.findByText(/client login/i)).toBeInTheDocument();
  });

  it('keeps user logged in when role exists', () => {
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Test User');
    renderWithProviders(<App />);
    expect(screen.queryByText(/user login/i)).not.toBeInTheDocument();
  });

  it('shows set password even when already logged in', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    window.history.pushState({}, '', '/set-password?token=abc');
    renderWithProviders(<App />);
    const els = await screen.findAllByText(/set password/i);
    expect(els.length).toBeGreaterThan(0);
  });

  it('redirects staff with only pantry access to pantry dashboard', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['pantry']));
    renderWithProviders(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/pantry'));
  });


  it('redirects staff with only volunteer management access', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['volunteer_management']));
    renderWithProviders(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/volunteer-management'));
  });

  it('redirects staff with only warehouse access', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['warehouse']));
    renderWithProviders(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/warehouse-management'));
  });

  it('shows admin links for admin staff', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Admin User');
    localStorage.setItem('access', JSON.stringify(['admin']));
    renderWithProviders(<App />);
    const adminButton = await screen.findByRole('button', { name: /^admin$/i });
    fireEvent.click(adminButton);
    expect(
      screen.queryByRole('menuitem', { name: 'App Config' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Settings' }),
    ).toBeInTheDocument();
  });
});
