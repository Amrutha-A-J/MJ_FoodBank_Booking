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

  it('searches and displays donors', async () => {
    (getMonetaryDonors as jest.Mock).mockImplementation(async (search?: string) => {
      const donors = [
        { id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
      ];
      if (!search) return [];
      const s = search.toLowerCase();
      return donors.filter(
        d =>
          d.id.toString().includes(s) ||
          d.firstName.toLowerCase().includes(s) ||
          d.lastName.toLowerCase().includes(s) ||
          d.email.toLowerCase().includes(s),
      );
    });

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
    fireEvent.change(input, { target: { value: 'Jane' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('Jane'),
    );

    const link = await screen.findByText('jane@example.com');
    const anchor = link.closest('a');
    expect(anchor).toHaveAttribute('href', '/donor-management/donors/1');

    fireEvent.change(input, { target: { value: '1' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('1'),
    );

    fireEvent.click(anchor!);
    expect(await screen.findByText('Donor Profile')).toBeInTheDocument();
  });
});

