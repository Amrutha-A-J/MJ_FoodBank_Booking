import { screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import { getStaffRootPath } from '../utils/staffRootPath';

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
jest.mock('../pages/warehouse-management/DonationLog', () => {
  const mod = { __esModule: true, default: () => <div>DonationLogPage</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});

jest.mock('../pages/donor-management/DonorDashboard', () => {
  const mod = { __esModule: true, default: () => <div>DonorDashboard</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});
  
jest.mock('../pages/donor-management/DonorProfile', () => {
  const mod = { __esModule: true, default: () => <div>DonorProfilePage</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});
jest.mock('../pages/donor-management/MailLists', () => {
  const mod = { __esModule: true, default: () => <div>MailLists</div> };
  (mod as any).then = (res: any) => Promise.resolve(res ? res(mod) : mod);
  return mod;
});

jest.mock('../api/bookings', () => ({
  getBookingHistory: jest.fn().mockResolvedValue([]),
  getSlots: jest.fn().mockResolvedValue([]),
  getHolidays: jest.fn().mockResolvedValue([]),
}));
jest.mock('../api/volunteers', () => ({
  getVolunteerBookingsForReview: jest.fn().mockResolvedValue([]),
}));

describe('App authentication persistence', () => {
  beforeEach(() => {
    fetchMock = mockFetch();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
      headers: new Headers(),
    });
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
    expect(await screen.findByText(/login/i)).toBeInTheDocument();
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

  it('computes pantry path for single pantry access', () => {
    expect(getStaffRootPath(['pantry'] as any)).toBe('/pantry');
  });

  it('computes warehouse path for single warehouse access', () => {
    expect(getStaffRootPath(['warehouse'] as any)).toBe('/warehouse-management');
  });

  it('computes aggregations path for single aggregations access', () => {
    expect(getStaffRootPath(['aggregations'] as any)).toBe('/aggregations/pantry');
  });

  it('shows donor management nav links for donor_management access', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['donor_management']));
    renderWithProviders(<App />);
    fireEvent.click(await screen.findByText('Donor Management'));
    expect(await screen.findByText('Donors')).toBeInTheDocument();
    expect(screen.getByText('Donation Log')).toBeInTheDocument();
    expect(screen.getByText('Mail Lists')).toBeInTheDocument();
  });

  it('shows donor management nav links for admin without donor_management', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['admin']));
    renderWithProviders(<App />);
    fireEvent.click(await screen.findByText('Donor Management'));
    expect(await screen.findByText('Donors')).toBeInTheDocument();
    expect(screen.getByText('Donation Log')).toBeInTheDocument();
    expect(screen.getByText('Mail Lists')).toBeInTheDocument();
  });

  it('shows aggregations nav links for aggregations access', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['aggregations']));
    renderWithProviders(<App />);
    fireEvent.click(await screen.findByText('Aggregations'));
    expect(await screen.findByText('Pantry Aggregations')).toBeInTheDocument();
    expect(screen.getByText('Warehouse Aggregations')).toBeInTheDocument();
  });

  it('shows aggregations nav links for donor management access', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['donor_management']));
    renderWithProviders(<App />);
    fireEvent.click(await screen.findByText('Aggregations'));
    expect(await screen.findByText('Pantry Aggregations')).toBeInTheDocument();
    expect(screen.getByText('Warehouse Aggregations')).toBeInTheDocument();
  });

  it('routes to donor donation log page', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['donor_management']));
    window.history.pushState({}, '', '/donor-management/donation-log');
    renderWithProviders(<App />);
    expect(await screen.findByText('DonationLogPage')).toBeInTheDocument();
  });

  it('routes to donor mail lists page', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['donor_management']));
    window.history.pushState({}, '', '/donor-management');
    renderWithProviders(<App />);
    expect(await screen.findByText('MailLists')).toBeInTheDocument();
  });

  it('routes admin without donor_management to donor pages', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['admin']));
    window.history.pushState({}, '', '/donor-management/donation-log');
    renderWithProviders(<App />);
    expect(await screen.findByText('DonationLogPage')).toBeInTheDocument();
  });

  it('redirects staff without donor_management access away from donor pages', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    localStorage.setItem('access', JSON.stringify(['pantry']));
    window.history.pushState({}, '', '/donor-management/donation-log');
    renderWithProviders(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByText('DonationLogPage')).not.toBeInTheDocument();
  });

  it('computes donor management path for single donor management access', () => {
    expect(getStaffRootPath(['donor_management'] as any)).toBe(
      '/donor-management',
    );
  });

  it('computes aggregations path for single aggregations access', () => {
    expect(getStaffRootPath(['aggregations'] as any)).toBe(
      '/aggregations/pantry',
    );
  });
});
