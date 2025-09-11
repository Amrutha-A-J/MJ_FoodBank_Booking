import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
    (getMonetaryDonors as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
      ]);

    renderWithProviders(
      <MemoryRouter>
        <Donors />
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

    expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
    const link = screen.getByText('jane@example.com').closest('a');
    expect(link).toHaveAttribute('href', '/donor-management/donors/1');
  });
});

