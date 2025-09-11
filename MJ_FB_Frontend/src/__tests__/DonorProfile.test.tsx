import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import DonorProfile from '../pages/donor-management/DonorProfile';
import {
  getMonetaryDonor,
  getMonetaryDonations,
  updateMonetaryDonation,
} from '../api/monetaryDonors';

jest.mock('../api/monetaryDonors', () => ({
  getMonetaryDonor: jest.fn(),
  getMonetaryDonations: jest.fn(),
  createMonetaryDonation: jest.fn(),
  updateMonetaryDonation: jest.fn(),
  deleteMonetaryDonation: jest.fn(),
}));

describe('DonorProfile', () => {
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
    expect(await screen.findByText('$100.00')).toBeInTheDocument();
  });

  it('edits an existing donation', async () => {
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
    (updateMonetaryDonation as jest.Mock).mockResolvedValue({});

    renderWithProviders(
      <MemoryRouter initialEntries={["/1"]}>
        <Routes>
          <Route path="/:id" element={<DonorProfile />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('$100.00');
    fireEvent.click(screen.getByLabelText('edit'));
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '150' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(updateMonetaryDonation).toHaveBeenCalledWith(1, {
        donorId: 1,
        amount: 150,
        date: '2024-01-01',
      }),
    );
  });
});

