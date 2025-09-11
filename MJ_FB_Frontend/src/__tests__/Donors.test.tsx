import { screen, fireEvent } from '@testing-library/react';
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
    (getMonetaryDonors as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('debounces search and displays results', async () => {
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    ]);
    renderWithProviders(
      <MemoryRouter>
        <Donors />
      </MemoryRouter>
    );

    expect(getMonetaryDonors).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(await screen.findByText('john@example.com')).toBeInTheDocument();

    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
    ]);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'jane' } });
    expect(getMonetaryDonors).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(300);
    expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
    expect(getMonetaryDonors).toHaveBeenLastCalledWith('jane');
  });

  it('links each donor row to profile', async () => {
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    ]);
    renderWithProviders(
      <MemoryRouter>
        <Donors />
      </MemoryRouter>
    );
    jest.runAllTimers();
    const emailCell = await screen.findByText('john@example.com');
    expect(emailCell.closest('a')).toHaveAttribute('href', '/donor-management/donors/1');
  });
});

