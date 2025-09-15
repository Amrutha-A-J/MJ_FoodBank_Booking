import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import Donors from '../pages/donor-management/Donors';
import { getMonetaryDonors } from '../api/monetaryDonors';

jest.mock('../api/monetaryDonors', () => ({
  getMonetaryDonors: jest.fn(),
}));

describe('Donors page', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it.each(['1', 'Jane', 'Doe', 'jane@example.com'])(
    'searches donors by %s',
    async term => {
      (getMonetaryDonors as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
        ]);

      renderWithProviders(
        <MemoryRouter initialEntries={["/donor-management/donors"]}>
          <Routes>
            <Route path="/donor-management/donors" element={<Donors />} />
            <Route
              path="/donor-management/donors/:id"
              element={<div>Donor Profile</div>}
            />
          </Routes>
        </MemoryRouter>,
      );

      const input = screen.getByLabelText('Search');
      fireEvent.change(input, { target: { value: term } });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() =>
        expect(getMonetaryDonors).toHaveBeenLastCalledWith(term),
      );

      const emailCell = await screen.findByText('jane@example.com');
      const row = emailCell.closest('tr');
      expect(row).toBeInTheDocument();

      fireEvent.click(row!);
      expect(await screen.findByText('Donor Profile')).toBeInTheDocument();
    },
  );
});

