import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import DonorProfile from '../pages/donor-management/DonorProfile';
import {
  getMonetaryDonor,
  getMonetaryDonations,
  updateMonetaryDonor,
} from '../api/monetaryDonors';

jest.mock('../api/monetaryDonors', () => ({
  getMonetaryDonor: jest.fn(),
  getMonetaryDonations: jest.fn(),
  createMonetaryDonation: jest.fn(),
  updateMonetaryDonation: jest.fn(),
  deleteMonetaryDonation: jest.fn(),
  updateMonetaryDonor: jest.fn(),
}));

describe('DonorProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads donor info and donations', async () => {
    (getMonetaryDonor as jest.Mock).mockResolvedValue({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      amount: 100,
      lastDonationISO: null,
    });
    (getMonetaryDonations as jest.Mock).mockResolvedValue([
      { id: 1, donorId: 1, amount: 100, date: '2024-01-01' },
    ]);

    renderWithProviders(
      <MemoryRouter initialEntries={["/1"]}>
        <Routes>
          <Route path="/:id" element={<DonorProfile />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(await screen.findByText('CA$100.00')).toBeInTheDocument();
    expect(screen.getByText('Last Donation: N/A')).toBeInTheDocument();
  });

  it('edits donor info', async () => {
    (getMonetaryDonor as jest.Mock)
      .mockResolvedValueOnce({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        amount: 100,
        lastDonationISO: null,
      })
      .mockResolvedValueOnce({
        id: 1,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        amount: 100,
        lastDonationISO: null,
      });
    (getMonetaryDonations as jest.Mock).mockResolvedValue([]);
    (updateMonetaryDonor as jest.Mock).mockResolvedValue({});

    renderWithProviders(
      <MemoryRouter initialEntries={["/1"]}>
        <Routes>
          <Route path="/:id" element={<DonorProfile />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('John Doe');
    await userEvent.click(screen.getByRole('button', { name: /edit donor/i }));

    const firstName = screen.getByLabelText(/first name/i) as HTMLInputElement;
    expect(firstName.value).toBe('John');
    await userEvent.clear(firstName);
    await userEvent.type(firstName, 'Jane');

    const lastName = screen.getByLabelText(/last name/i) as HTMLInputElement;
    await userEvent.clear(lastName);
    await userEvent.type(lastName, 'Smith');

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    await userEvent.clear(email);
    await userEvent.type(email, 'jane@example.com');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(updateMonetaryDonor).toHaveBeenCalledWith(1, {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    });
    expect(await screen.findByText('Donor updated')).toBeInTheDocument();
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });
});

