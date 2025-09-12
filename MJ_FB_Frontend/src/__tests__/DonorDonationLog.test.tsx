import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { setImmediate as _setImmediate, clearImmediate as _clearImmediate } from 'timers';
import { MemoryRouter } from 'react-router-dom';
import { renderWithProviders } from '../../testUtils/renderWithProviders';
import DonationLog from '../pages/donor-management/DonationLog';
import {
  getMonetaryDonors,
  getMonetaryDonations,
  importZeffyDonations,
  updateMonetaryDonation,
  deleteMonetaryDonation,
} from '../api/monetaryDonors';

jest.mock('../api/monetaryDonors', () => ({
  getMonetaryDonors: jest.fn(),
  getMonetaryDonations: jest.fn(),
  createMonetaryDonor: jest.fn(),
  createMonetaryDonation: jest.fn(),
  importZeffyDonations: jest.fn(),
  updateMonetaryDonation: jest.fn(),
  deleteMonetaryDonation: jest.fn(),
}));

describe('Donor Donation Log', () => {
  const fixedTime = new Date('2024-01-01T12:00:00Z').getTime();
  const realDateNow = Date.now;
  beforeEach(() => {
    (global as any).setImmediate = _setImmediate;
    (global as any).clearImmediate = _clearImmediate;
    Date.now = () => fixedTime;
  });

  afterEach(() => {
    Date.now = realDateNow;
    jest.clearAllMocks();
  });

  it('loads donations for the current month', async () => {
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    ]);
    (getMonetaryDonations as jest.Mock).mockImplementation(async () => [
      { id: 1, donorId: 1, amount: 50, date: '2024-01-10' },
      { id: 2, donorId: 1, amount: 75, date: '2024-02-05' },
    ]);

    renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );

    expect(await screen.findByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.queryByText('$75.00')).not.toBeInTheDocument();
  });

  it('edits and deletes a donation', async () => {
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    ]);
    (getMonetaryDonations as jest.Mock).mockResolvedValue([
      { id: 1, donorId: 1, amount: 50, date: '2024-01-10' },
    ]);
    (updateMonetaryDonation as jest.Mock).mockResolvedValue({});
    (deleteMonetaryDonation as jest.Mock).mockResolvedValue({});

    renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );

    await screen.findByText('$50.00');

    fireEvent.click(screen.getByLabelText('Edit donation'));
    const amountField = screen.getByLabelText('Amount');
    fireEvent.change(amountField, { target: { value: '75' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(updateMonetaryDonation).toHaveBeenCalledWith(1, {
        donorId: 1,
        amount: 75,
        date: '2024-01-10',
      }),
    );

    fireEvent.click(screen.getByLabelText('Delete donation'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(deleteMonetaryDonation).toHaveBeenCalledWith(1));
  });

  it('filters donations by search', async () => {
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
    ]);
    (getMonetaryDonations as jest.Mock).mockImplementation(async (donorId: number) => {
      if (donorId === 1) return [{ id: 1, donorId: 1, amount: 50, date: '2024-01-10' }];
      if (donorId === 2) return [{ id: 2, donorId: 2, amount: 100, date: '2024-01-15' }];
      return [];
    });

    renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );

    expect(await screen.findByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();

    const searchField = screen.getByLabelText('Search');

    fireEvent.change(searchField, { target: { value: '2' } });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('2'),
    );
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: 'john' } });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('john'),
    );
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: 'Smith' } });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('Smith'),
    );
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: 'jane@example.com' } });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('jane@example.com'),
    );
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: '' } });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith(undefined),
    );
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('handles donors without emails in display and search', async () => {
    (getMonetaryDonors as jest.Mock).mockResolvedValue([
      { id: 1, firstName: 'No', lastName: 'Email', email: null },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
    ]);
    (getMonetaryDonations as jest.Mock).mockImplementation(async (donorId: number) =>
      donorId === 1
        ? [{ id: 1, donorId: 1, amount: 50, date: '2024-01-10' }]
        : [{ id: 2, donorId: 2, amount: 100, date: '2024-01-15' }],
    );

    renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );

    expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();

    const searchField = screen.getByLabelText('Search');
    fireEvent.change(searchField, { target: { value: 'No' } });
    await waitFor(() => expect(getMonetaryDonors).toHaveBeenLastCalledWith('No'));
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();

    fireEvent.change(searchField, { target: { value: 'jane@example.com' } });
    await waitFor(() =>
      expect(getMonetaryDonors).toHaveBeenLastCalledWith('jane@example.com'),
    );
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.queryByText('No')).not.toBeInTheDocument();
  });

  it('imports donations and reloads list', async () => {
    (getMonetaryDonors as jest.Mock)
      .mockResolvedValueOnce([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      ])
      .mockResolvedValueOnce([
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      ]);
    (getMonetaryDonations as jest.Mock).mockResolvedValue([
      { id: 1, donorId: 1, amount: 50, date: '2024-01-10' },
    ]);
    (importZeffyDonations as jest.Mock).mockResolvedValue({});

    renderWithProviders(
      <MemoryRouter>
        <DonationLog />
      </MemoryRouter>,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = { name: 'donations.csv' } as File;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => expect(importZeffyDonations).toHaveBeenCalled());
    await waitFor(() => expect(getMonetaryDonors).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getMonetaryDonations).toHaveBeenCalledTimes(2));
    await screen.findByText('Donations imported');
  });
});

