import { screen, waitFor, act } from '@testing-library/react';
import App from '../App';
import { mockFetch, restoreFetch } from '../../testUtils/mockFetch';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
let fetchMock: jest.Mock;

jest.setTimeout(10000);

async function renderApp(path?: string) {
  if (path) {
    window.history.pushState({}, '', path);
  }
  await act(async () => {
    renderWithProviders(<App />);
  });
}

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
    await renderApp();
    expect(
      await screen.findByRole('heading', { name: /login/i }),
    ).toBeInTheDocument();
  });

  it('allows access to privacy policy without login', async () => {
    await renderApp('/privacy');
    expect(
      await screen.findByRole('heading', { name: /privacy policy/i })
    ).toBeInTheDocument();
  });

  it('keeps user logged in when role exists', async () => {
    localStorage.setItem('role', 'shopper');
    localStorage.setItem('name', 'Test User');
    await renderApp();
    expect(screen.queryByText(/user login/i)).not.toBeInTheDocument();
  });

  it('shows set password even when already logged in', async () => {
    localStorage.setItem('role', 'staff');
    localStorage.setItem('name', 'Test Staff');
    await renderApp('/set-password?token=abc');
    const els = await screen.findAllByText(/set password/i);
    expect(els.length).toBeGreaterThan(0);
  });

  describe('staff navigation', () => {
    beforeEach(() => {
      localStorage.setItem('role', 'staff');
      localStorage.setItem('name', 'Test Staff');
    });

    it.each([
      {
        access: ['donor_management'],
        description: 'donor donation log page for donor management access',
        path: '/donor-management/donation-log',
      },
      {
        access: ['donor_management'],
        description: 'donor management home for donor management access',
        path: '/donor-management',
      },
      {
        access: ['admin'],
        description:
          'donor donation log page for admin without donor management access',
        path: '/donor-management/donation-log',
      },
    ])('routes staff to the $description', async ({ access, path }) => {
      localStorage.setItem('access', JSON.stringify(access));
      await renderApp(path);
      await waitFor(() => expect(window.location.pathname).not.toBe('/'));
    });

    it('redirects staff without donor_management access away from donor pages', async () => {
      localStorage.setItem('access', JSON.stringify(['pantry']));
      await renderApp('/donor-management/donation-log');
      await waitFor(() => expect(window.location.pathname).toBe('/'));
      expect(screen.queryByText('DonationLogPage')).not.toBeInTheDocument();
    });
  });
});
