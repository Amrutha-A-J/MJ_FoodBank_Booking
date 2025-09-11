import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DonorsPage from '../pages/donor-management/DonorsPage';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import { getMonetaryDonors } from '../api/monetaryDonors';

jest.mock('../api/monetaryDonors', () => ({
  getMonetaryDonors: jest.fn(),
}));

describe('DonorsPage', () => {
  beforeEach(() => {
    (getMonetaryDonors as jest.Mock).mockClear();
  });

  it('searches donors and navigates to profile', async () => {
    (getMonetaryDonors as jest.Mock)
      .mockResolvedValueOnce([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      ])
      .mockResolvedValueOnce([
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      ]);

    renderWithProviders(
      <MemoryRouter initialEntries={["/donor-management/donors"]}>
        <Routes>
          <Route path="/donor-management/donors" element={<DonorsPage />} />
          <Route path="/donor-management/donors/:id" element={<div>Profile Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: 'Jane' },
    });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('Jane'),
    );
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Jane Smith'));
    await waitFor(() =>
      expect(screen.getByText('Profile Page')).toBeInTheDocument(),
    );
  });
});

