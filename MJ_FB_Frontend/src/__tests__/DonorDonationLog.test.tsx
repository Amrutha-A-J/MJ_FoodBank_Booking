import { screen } from '@testing-library/react';
import { renderWithProviders } from '../testUtils/renderWithProviders';
import DonationLog from '../pages/donor-management/DonationLog';
import {
  getMonetaryDonors,
  getMonetaryDonations,
} from '../api/monetaryDonors';

jest.mock('../api/monetaryDonors', () => ({
  getMonetaryDonors: jest.fn(),
  getMonetaryDonations: jest.fn(),
  createMonetaryDonor: jest.fn(),
  createMonetaryDonation: jest.fn(),
  updateMonetaryDonation: jest.fn(),
  deleteMonetaryDonation: jest.fn(),
}));

describe('Donor Donation Log', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('loads donations for the selected date', async () => {
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    ]);
    (getMonetaryDonations as jest.Mock).mockImplementation(async () => [
      { id: 1, donorId: 1, amount: 50, date: '2024-01-01' },
    ]);

    renderWithProviders(<DonationLog />);

    expect(await screen.findByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });
});

