import { screen } from '@testing-library/react';
import App from '../App';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import type { ReactNode } from 'react';

jest.mock('../hooks/useAuth', () => {
  const actual = jest.requireActual('../hooks/useAuth');
  return {
    ...actual,
    AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useAuth: () => ({
      isAuthenticated: true,
      role: 'volunteer',
      access: ['donation_entry'],
      name: 'Donation User',
      userRole: '',
      id: 1,
      login: jest.fn(),
      logout: jest.fn(),
      cardUrl: '',
      ready: true,
    }),
  };
});

jest.mock('../hooks/useMaintenance', () => ({
  __esModule: true,
  default: () => ({ maintenanceMode: false, notice: undefined, isLoading: false }),
}));

jest.mock('../api/donors', () => ({
  getDonors: jest.fn().mockResolvedValue([]),
  createDonor: jest.fn(),
}));

jest.mock('../api/donations', () => ({
  getDonationsByMonth: jest.fn().mockResolvedValue([]),
  createDonation: jest.fn(),
  updateDonation: jest.fn(),
  deleteDonation: jest.fn(),
}));

describe('donation entry volunteer access', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('redirects to donation log', async () => {
    renderWithProviders(<App />);
    expect(await screen.findByText(/Donation Log/i)).toBeInTheDocument();
  });
});
